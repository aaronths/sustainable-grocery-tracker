import { Router } from "express";
import { getState, getOpenWeek } from "../store";
import { notFound } from "../lib/http-error";
import { round1 } from "../domain/scoring";
import { makeId } from "../lib/ids";
import type { Category, LineItem, Swap, SwapsResponse } from "../domain/types";

const router = Router();

// The "biggest win this week" swap: look at this week's confirmed receipt
// items and, for each, find the lowest-kgCo2ePerKg category in the same
// group (e.g. ground beef -> canned tuna, both "Meat & fish"). Recommend
// whichever swap would have saved the most CO2e. "More ideas" below it
// stays the hardcoded seed list.
function computeHeroSwap(): Swap | null {
  const state = getState();
  const openWeek = getOpenWeek();
  const categoryById = new Map(state.categories.map((c) => [c.id, c]));

  let best: { item: LineItem; alt: Category; savingKg: number } | null = null;

  for (const receipt of state.receipts) {
    if (receipt.status !== "confirmed" || receipt.weekId !== openWeek.id) continue;
    for (const item of receipt.items) {
      const category = categoryById.get(item.categoryId);
      if (!category) continue;

      const alt = state.categories
        .filter((c) => c.group === category.group && c.kgCo2ePerKg < category.kgCo2ePerKg)
        .sort((a, b) => a.kgCo2ePerKg - b.kgCo2ePerKg)[0];
      if (!alt) continue;

      const savingKg = round1(item.massKg * (category.kgCo2ePerKg - alt.kgCo2ePerKg));
      if (savingKg <= 0) continue;
      if (!best || savingKg > best.savingKg) {
        best = { item, alt, savingKg };
      }
    }
  }

  if (!best) return null;

  return {
    id: makeId("swap"),
    fromName: best.item.name,
    toName: best.alt.name,
    context: "From this week's groceries",
    savingKg: best.savingKg,
    committed: false,
  };
}

router.get("/swaps", (_req, res) => {
  const hero = computeHeroSwap();
  const ideas = getState().swaps.slice().sort((a, b) => b.savingKg - a.savingKg);
  const response: SwapsResponse = { hero, ideas };
  res.json(response);
});

router.post("/swaps/:id/commit", (req, res, next) => {
  const swap = getState().swaps.find((s) => s.id === req.params.id);
  if (!swap) return next(notFound(`Swap ${req.params.id} not found`));
  swap.committed = true;
  res.json(swap);
});

export default router;
