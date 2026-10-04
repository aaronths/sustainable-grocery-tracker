import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/index";
import { resetStore } from "../src/store";

// Route tests exercise the receipt lifecycle, not Claude's parsing quality
// (that's covered by tests/parser.test.ts with a mocked Anthropic client).
// Mocking the stub here keeps this suite fast, deterministic, and network-free.
vi.mock("../src/stubs/parser", async () => {
  const canned = await vi.importActual<typeof import("../src/stubs/cannedReceipt")>(
    "../src/stubs/cannedReceipt",
  );
  return { parseReceipt: async () => ({ store: "Test Market", items: canned.cannedReceiptItems() }) };
});

// Keeps GET /api/health/recommendations network-free and deterministic: a
// canned Finchnode fixture, and a Claude classification call that always
// succeeds with a fixed diet flag (classification quality itself is covered
// by tests/health.test.ts with a mocked Anthropic client).
vi.mock("../src/stubs/finchnode", async () => {
  const actual = await vi.importActual<typeof import("../src/stubs/finchnode")>(
    "../src/stubs/finchnode",
  );
  return {
    ...actual,
    fetchPatientRecords: async () => actual.cannedPatientRecords(),
    createConnectSession: async () => ({ status: "complete" as const, patientId: "patient-demo-001" }),
  };
});

vi.mock("../src/lib/anthropicClient", () => ({
  getAnthropicClient: () => ({
    messages: { parse: async () => ({ parsed_output: { dietFlags: ["low-fat"] } }) },
  }),
}));

beforeEach(() => {
  resetStore();
});

describe("GET /api/health", () => {
  it("is ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe("GET /api/dashboard", () => {
  it("reflects the seeded open week (over limit)", async () => {
    const res = await request(app).get("/api/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(33.1);
    expect(res.body.baseline).toBe(28.4);
    expect(res.body.status).toBe("over");
    expect(res.body.excessKg).toBeGreaterThan(0);
  });
});

describe("GET /api/weeks", () => {
  it("returns closed weeks newest first, defaulting to 12", async () => {
    const res = await request(app).get("/api/weeks");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(12);
    expect(res.body[0].totalKg).toBe(28.4); // most recent close, per seed
  });
});

describe("POST /api/dev/simulate", () => {
  it("produces each of the three Home states", async () => {
    for (const status of ["below", "within", "over"] as const) {
      const res = await request(app).post("/api/dev/simulate").send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });

  it("rejects an invalid status", async () => {
    const res = await request(app).post("/api/dev/simulate").send({ status: "sideways" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("offsets flow", () => {
  it("400s a quote when not over limit", async () => {
    await request(app).post("/api/dev/simulate").send({ status: "within" });
    const res = await request(app).post("/api/offsets/quote");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("NOT_OVER_LIMIT");
  });

  it("quotes and purchases an offset when over limit", async () => {
    await request(app).post("/api/dev/simulate").send({ status: "over" });
    const quoteRes = await request(app).post("/api/offsets/quote");
    expect(quoteRes.status).toBe(200);
    expect(quoteRes.body.kg).toBeGreaterThan(0);
    expect(quoteRes.body.totalCents).toBe(quoteRes.body.costCents + quoteRes.body.feeCents);

    const purchaseRes = await request(app)
      .post("/api/offsets")
      .send({ quoteId: quoteRes.body.id });
    expect(purchaseRes.status).toBe(201);
    expect(purchaseRes.body.quoteId).toBe(quoteRes.body.id);

    const historyRes = await request(app).get("/api/offsets");
    expect(historyRes.body.offsets.some((o: { id: string }) => o.id === purchaseRes.body.id)).toBe(true);
  });
});

describe("POST /api/weeks/current/close", () => {
  it("closes the open week and returns week, streak, newLow and outcome", async () => {
    const res = await request(app).post("/api/weeks/current/close");
    expect(res.status).toBe(200);
    expect(res.body.week.closed).toBe(true);
    expect(res.body).toHaveProperty("streak");
    expect(res.body).toHaveProperty("newLow");
    expect(res.body).toHaveProperty("outcome");

    const weeksRes = await request(app).get("/api/weeks");
    expect(weeksRes.body[0].id).toBe(res.body.week.id);
  });
});

describe("receipts flow", () => {
  it("uploads, parses, corrects a low-confidence item, confirms, and updates the dashboard", async () => {
    const before = await request(app).get("/api/dashboard");

    const uploadRes = await request(app)
      .post("/api/receipts")
      .attach("image", Buffer.from("fake-image-bytes"), "receipt.jpg");
    expect(uploadRes.status).toBe(202);
    expect(uploadRes.body.status).toBe("processing");

    await new Promise((resolve) => setTimeout(resolve, 1700));

    const readyRes = await request(app).get(`/api/receipts/${uploadRes.body.id}`);
    expect(readyRes.body.status).toBe("ready");
    expect(readyRes.body.items.length).toBeGreaterThan(0);
    expect(readyRes.body.store).toBe("Test Market"); // detected store replaces the "Unknown store" placeholder

    const lowConfidenceItem = readyRes.body.items.find((i: { confidence: number }) => i.confidence < 0.7);
    expect(lowConfidenceItem).toBeTruthy();

    const categories = await request(app).get("/api/categories");
    const otherCategory = categories.body.find((c: { id: string }) => c.id !== lowConfidenceItem.categoryId);

    const patchRes = await request(app)
      .patch(`/api/receipts/${uploadRes.body.id}/items/${lowConfidenceItem.id}`)
      .send({ categoryId: otherCategory.id });
    expect(patchRes.status).toBe(200);
    const patchedItem = patchRes.body.items.find((i: { id: string }) => i.id === lowConfidenceItem.id);
    expect(patchedItem.categoryId).toBe(otherCategory.id);
    expect(patchedItem.kgCo2e).toBe(
      Math.round(patchedItem.massKg * otherCategory.kgCo2ePerKg * 10) / 10,
    );

    const confirmRes = await request(app).post(`/api/receipts/${uploadRes.body.id}/confirm`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.total).toBeGreaterThan(before.body.total);
  }, 10_000);

  it("404s for an unknown receipt", async () => {
    const res = await request(app).get("/api/receipts/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/stats/macros", () => {
  it("sums macros across the open week's confirmed receipts by category group", async () => {
    const res = await request(app).get("/api/stats/macros");
    expect(res.status).toBe(200);
    expect(res.body.byGroup).toHaveLength(5);
    expect(res.body.totalKcal).toBeGreaterThan(0);
    const sumOfGroups = res.body.byGroup.reduce(
      (sum: number, g: { kcal: number }) => sum + g.kcal,
      0,
    );
    expect(res.body.totalKcal).toBe(sumOfGroups);
  });
});

describe("health records linking", () => {
  it("GET /api/health/recommendations reports unlinked with no data before linking", async () => {
    const res = await request(app).get("/api/health/recommendations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ linked: false, dietFlags: [], allergyAlerts: [], recommendations: [] });
  });

  it("POST /api/health/link then GET /api/health/recommendations returns diet flags, allergy alerts, and a swap recommendation", async () => {
    const linkRes = await request(app).post("/api/health/link");
    expect(linkRes.status).toBe(200);
    expect(linkRes.body).toEqual({ linked: true, patientId: "patient-demo-001" });

    const res = await request(app).get("/api/health/recommendations");
    expect(res.status).toBe(200);
    expect(res.body.linked).toBe(true);
    expect(res.body.dietFlags).toEqual(["low-fat"]);
    expect(res.body.allergyAlerts).toEqual(["Peanut"]);
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });
});

describe("POST /api/dev/reset", () => {
  it("restores the seeded dashboard", async () => {
    await request(app).post("/api/dev/simulate").send({ status: "below" });
    await request(app).post("/api/dev/reset");
    const res = await request(app).get("/api/dashboard");
    expect(res.body.total).toBe(33.1);
    expect(res.body.status).toBe("over");
  });
});
