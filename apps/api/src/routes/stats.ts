import { Router } from "express";
import { getState } from "../store";
import { round1 } from "../domain/scoring";
import type { CategoryGroup, CategoryStat } from "../domain/types";

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

export default router;
