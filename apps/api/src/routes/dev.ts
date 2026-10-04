import { Router } from "express";
import { z } from "zod";
import { getOpenWeek, getState, resetStore } from "../store";
import { computeLimit, round1 } from "../domain/scoring";
import { parseOrThrow } from "../lib/validate";
import { makeId } from "../lib/ids";
import { buildDashboard } from "../lib/dashboard";

const router = Router();

const simulateSchema = z.object({ status: z.enum(["below", "within", "over"]) }).strict();

router.post("/dev/simulate", (req, res) => {
  const body = parseOrThrow(simulateSchema, req.body);
  const state = getState();
  const openWeek = getOpenWeek();
  const baseline = state.streak.baselineKg;
  const limit = computeLimit(baseline);

  const targets: Record<typeof body.status, number> = {
    below: round1(baseline * 0.9),
    within: round1((baseline + limit) / 2),
    over: round1(limit * 1.15),
  };
  const targetTotal = targets[body.status];
  const fillerCategory = state.categories[0];

  state.receipts = state.receipts.filter((r) => r.weekId !== openWeek.id);
  state.receipts.push({
    id: makeId("rcpt"),
    weekId: openWeek.id,
    store: "Dev simulation",
    uploadedAt: new Date().toISOString(),
    status: "confirmed",
    items: [
      {
        id: makeId("item"),
        rawText: "SIMULATED TOTAL",
        name: "Simulated groceries",
        categoryId: fillerCategory.id,
        quantity: 1,
        massKg: round1(targetTotal / fillerCategory.kgCo2ePerKg),
        kgCo2e: targetTotal,
        confidence: 1,
      },
    ],
  });
  openWeek.totalKg = targetTotal;

  res.json(buildDashboard());
});

router.post("/dev/reset", (_req, res) => {
  resetStore();
  res.json({ ok: true });
});

export default router;
