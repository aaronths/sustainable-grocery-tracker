import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/anthropicClient", () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from "../src/lib/anthropicClient";
import { parseReceipt } from "../src/stubs/parser";

function mockClient(parse: (...args: unknown[]) => Promise<unknown>) {
  vi.mocked(getAnthropicClient).mockReturnValue({
    messages: { parse },
  } as unknown as ReturnType<typeof getAnthropicClient>);
}

describe("parseReceipt", () => {
  it("returns the store name and items derived from Claude's structured output on success", async () => {
    mockClient(async () => ({
      parsed_output: {
        store: "Trader Joe's",
        items: [
          {
            rawText: "ORG AVOCADO",
            name: "Avocado",
            categoryId: "avocado",
            massKg: 0.3,
            kcal: 480,
            proteinG: 6,
            carbsG: 27,
            fatG: 45,
            confidence: 0.82,
          },
        ],
      },
    }));

    const { store, items } = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");

    expect(store).toBe("Trader Joe's");
    expect(items).toHaveLength(1);
    expect(items[0].categoryId).toBe("avocado");
    expect(items[0].massKg).toBe(0.3);
    expect(items[0].kgCo2e).toBeCloseTo(0.3 * 2.3, 1); // avocado factor from categories.json
    expect(items[0].confidence).toBe(0.82);
    // Macros pass through from Claude's own per-item estimate, not derived from category density.
    expect(items[0].kcal).toBe(480);
    expect(items[0].proteinG).toBe(6);
    expect(items[0].carbsG).toBe(27);
    expect(items[0].fatG).toBe(45);
  });

  it("replaces a low-confidence mass guess with the category's standard portion size", async () => {
    mockClient(async () => ({
      parsed_output: {
        store: "Kroger",
        items: [
          {
            rawText: "???",
            name: "Chicken breast",
            categoryId: "chicken",
            massKg: 5.0, // an implausible guess Claude made on a hard-to-read line
            kcal: 9999,
            proteinG: 999,
            carbsG: 999,
            fatG: 999,
            confidence: 0.4, // below LOW_CONFIDENCE_THRESHOLD
          },
        ],
      },
    }));

    const { items } = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");

    expect(items).toHaveLength(1);
    expect(items[0].massKg).toBe(0.7); // chicken's typicalMassKg from categories.json, not Claude's 5.0
    // Macros/CO2e are recomputed from the corrected mass, not Claude's stale guess.
    expect(items[0].kgCo2e).toBeCloseTo(0.7 * 6.9, 1);
    expect(items[0].kcal).toBe(Math.round(0.7 * 1650));
    expect(items[0].proteinG).not.toBe(999);
  });

  it("falls back to the canned fixture (and 'Unknown store') when the API call throws", async () => {
    mockClient(async () => {
      throw new Error("network error");
    });

    const { store, items } = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");

    expect(store).toBe("Unknown store");
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.confidence < 0.7)).toBe(true); // known canned-fixture property
  });

  it("falls back to the canned fixture when Claude returns no parsed output", async () => {
    mockClient(async () => ({ parsed_output: null }));

    const { items } = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");
    expect(items.length).toBeGreaterThan(0);
  });

  it("falls back to the canned fixture for an unsupported image type", async () => {
    mockClient(async () => {
      throw new Error("should not be called");
    });

    const { items } = await parseReceipt(Buffer.from("fake-image"), "application/pdf");
    expect(items.length).toBeGreaterThan(0);
  });
});
