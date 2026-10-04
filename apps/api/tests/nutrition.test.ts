import { describe, expect, it } from "vitest";
import { computeMacros } from "../src/domain/nutrition";
import type { Category } from "../src/domain/types";

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

describe("computeMacros", () => {
  it("scales per-kg density by mass, mirroring the kgCo2e computation", () => {
    const macros = computeMacros(0.5, category());
    expect(macros).toEqual({ kcal: 825, proteinG: 155, carbsG: 0, fatG: 18 });
  });

  it("rounds grams to one decimal and calories to the nearest whole number", () => {
    const macros = computeMacros(0.33, category({ kcalPerKg: 1000, proteinGPerKg: 100 }));
    expect(macros.kcal).toBe(330);
    expect(macros.proteinG).toBe(33);
  });
});
