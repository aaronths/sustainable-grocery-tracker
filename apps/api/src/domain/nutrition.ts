import { round1 } from "./scoring";
import type { Category } from "./types";

export interface MacroTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Deterministic macro totals for a given mass, derived from a category's
 * per-kg density — the same shape as `kgCo2e = massKg * kgCo2ePerKg`. Used
 * wherever an item isn't coming fresh off Claude's own per-item estimate
 * (the canned fallback fixture, seed data, and any item a user corrects the
 * category/quantity of), so a category change always lands on a trustworthy
 * value rather than keeping a stale vision-model guess tied to the old
 * category.
 */
export function computeMacros(massKg: number, category: Category): MacroTotals {
  return {
    kcal: Math.round(massKg * category.kcalPerKg),
    proteinG: round1(massKg * category.proteinGPerKg),
    carbsG: round1(massKg * category.carbsGPerKg),
    fatG: round1(massKg * category.fatGPerKg),
  };
}
