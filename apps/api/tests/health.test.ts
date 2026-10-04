import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/anthropicClient", () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from "../src/lib/anthropicClient";
import { classifyHealthProfile, computeHealthRecommendations } from "../src/domain/health";
import type { Category, LineItem } from "../src/domain/types";
import type { PatientRecords } from "../src/stubs/finchnode";

function mockClient(parse: (...args: unknown[]) => Promise<unknown>) {
  vi.mocked(getAnthropicClient).mockReturnValue({
    messages: { parse },
  } as unknown as ReturnType<typeof getAnthropicClient>);
}

function records(overrides: Partial<PatientRecords> = {}): PatientRecords {
  return { conditions: [], allergies: [], immunizations: [], ...overrides };
}

describe("classifyHealthProfile", () => {
  it("returns Claude's structured classification on success", async () => {
    mockClient(async () => ({ parsed_output: { dietFlags: ["low-carb"] } }));

    const profile = await classifyHealthProfile(
      records({
        conditions: [
          {
            name: "Type 2 diabetes",
            status: "active",
            verificationStatus: null,
            severity: null,
            onsetDate: null,
            recordedDate: null,
          },
        ],
      }),
    );

    expect(profile.dietFlags).toEqual(["low-carb"]);
  });

  it("falls back to keyword classification when Claude throws", async () => {
    mockClient(async () => {
      throw new Error("network error");
    });

    const profile = await classifyHealthProfile(
      records({
        conditions: [
          {
            name: "Hyperlipidemia (high cholesterol)",
            status: "active",
            verificationStatus: null,
            severity: null,
            onsetDate: null,
            recordedDate: null,
          },
        ],
        allergies: [
          {
            substance: "Peanut",
            reaction: null,
            severity: null,
            status: null,
            verificationStatus: null,
            recordedDate: null,
          },
        ],
      }),
    );

    expect(profile.dietFlags).toEqual(["low-fat"]);
    expect(profile.allergyAlerts).toEqual(["Peanut"]);
  });

  it("skips the LLM call and returns no diet flags when there are no conditions", async () => {
    mockClient(async () => {
      throw new Error("should not be called");
    });

    const profile = await classifyHealthProfile(records());
    expect(profile.dietFlags).toEqual([]);
  });
});

describe("computeHealthRecommendations", () => {
  function category(overrides: Partial<Category> = {}): Category {
    return {
      id: "chicken",
      name: "Chicken breast",
      group: "Meat & fish",
      kgCo2ePerKg: 6.9,
      kcalPerKg: 1650,
      proteinGPerKg: 310,
      carbsGPerKg: 0,
      fatGPerKg: 36,
      typicalMassKg: 0.7,
      ...overrides,
    };
  }

  function item(overrides: Partial<LineItem> = {}): LineItem {
    return {
      id: "item-1",
      rawText: "",
      name: "Ground beef",
      categoryId: "beef",
      quantity: 1,
      massKg: 0.5,
      kgCo2e: 30,
      kcal: 1270,
      proteinG: 85,
      carbsG: 0,
      fatG: 100,
      confidence: 0.9,
      ...overrides,
    };
  }

  it("suggests the lowest-fat same-group alternative for a low-fat flag", () => {
    const beef = category({ id: "beef", name: "Ground beef", fatGPerKg: 200, kcalPerKg: 2540 });
    const chicken = category({ id: "chicken", name: "Chicken breast", fatGPerKg: 36, kcalPerKg: 1650 });

    const recs = computeHealthRecommendations(["low-fat"], [item({ categoryId: "beef" })], [beef, chicken]);

    expect(recs).toEqual([
      {
        dietFlag: "low-fat",
        fromName: "Ground beef",
        toName: "Chicken breast",
        context: "Lower fat, from this week's groceries",
      },
    ]);
  });

  it("returns nothing for a flag when no better same-group alternative exists", () => {
    const chicken = category({ id: "chicken", fatGPerKg: 36 });
    const recs = computeHealthRecommendations(["low-fat"], [item({ categoryId: "chicken" })], [chicken]);
    expect(recs).toEqual([]);
  });
});
