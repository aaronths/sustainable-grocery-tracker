import { Router } from "express";
import { getState, getOpenWeek } from "../store";
import { round1 } from "../domain/scoring";
import type { CategoryGroup, CategoryStat, MacroGroupStat, MacroStatsResponse } from "../domain/types";

const router = Router();

const GROUPS: CategoryGroup[] = [
  "Meat & fish",
  "Dairy & eggs",
  "Produce",
  "Grains & bakery",
  "Snacks & drinks",
];

router.get("/stats/categories", (req, res) => {
  const state = getState();
  const weeksParam = typeof req.query.weeks === "string" ? Number(req.query.weeks) : 12;
  const weeksCount = Number.isFinite(weeksParam) && weeksParam > 0 ? Math.floor(weeksParam) : 12;

  const weeksNewestFirst = state.weeks.slice().reverse().slice(0, weeksCount);
  const weekIds = new Set(weeksNewestFirst.map((w) => w.id));
  const groupByCategoryId = new Map(state.categories.map((c) => [c.id, c.group]));

  const totalsByGroup = new Map<CategoryGroup, number>(GROUPS.map((g) => [g, 0]));

  for (const receipt of state.receipts) {
    if (receipt.status !== "confirmed" || !weekIds.has(receipt.weekId)) continue;
    for (const item of receipt.items) {
      const group = groupByCategoryId.get(item.categoryId);
      if (!group) continue;
      totalsByGroup.set(group, (totalsByGroup.get(group) ?? 0) + item.kgCo2e);
    }
  }

  const divisor = Math.max(1, weeksNewestFirst.length);
  const stats: CategoryStat[] = GROUPS.map((group) => ({
    group,
    avgKgCo2e: round1((totalsByGroup.get(group) ?? 0) / divisor),
  }));

  res.json(stats);
});

// Scoped to the current open week's confirmed receipts only (not a 12-week
// average like /stats/categories): this is "what did you buy this week", the
// basis for any future diet-swap recommendations off a patient-records API.
export function computeMacroStats(): MacroStatsResponse {
  const state = getState();
  const openWeek = getOpenWeek();
  const groupByCategoryId = new Map(state.categories.map((c) => [c.id, c.group]));

  const totalsByGroup = new Map<CategoryGroup, MacroGroupStat>(
    GROUPS.map((group) => [group, { group, kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 }]),
  );

  for (const receipt of state.receipts) {
    if (receipt.status !== "confirmed" || receipt.weekId !== openWeek.id) continue;
    for (const item of receipt.items) {
      const group = groupByCategoryId.get(item.categoryId);
      if (!group) continue;
      const stat = totalsByGroup.get(group)!;
      stat.kcal += item.kcal;
      stat.proteinG += item.proteinG;
      stat.carbsG += item.carbsG;
      stat.fatG += item.fatG;
    }
  }

  const byGroup = GROUPS.map((group) => {
    const stat = totalsByGroup.get(group)!;
    return {
      group,
      kcal: Math.round(stat.kcal),
      proteinG: round1(stat.proteinG),
      carbsG: round1(stat.carbsG),
      fatG: round1(stat.fatG),
    };
  });

  return {
    weekId: openWeek.id,
    totalKcal: Math.round(byGroup.reduce((sum, g) => sum + g.kcal, 0)),
    totalProteinG: round1(byGroup.reduce((sum, g) => sum + g.proteinG, 0)),
    totalCarbsG: round1(byGroup.reduce((sum, g) => sum + g.carbsG, 0)),
    totalFatG: round1(byGroup.reduce((sum, g) => sum + g.fatG, 0)),
    byGroup,
  };
}

router.get("/stats/macros", (_req, res) => {
  res.json(computeMacroStats());
});

export default router;
