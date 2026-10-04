import { Router } from "express";
import { getClosedWeeks, getOpenWeek, getState, hasCoveringOffset } from "../store";
import { closeWeek, shiftWeekWindow } from "../domain/scoring";
import { makeId } from "../lib/ids";
import type { CloseWeekResponse, Week } from "../domain/types";

const router = Router();

router.get("/weeks", (req, res) => {
  const limitParam = typeof req.query.limit === "string" ? Number(req.query.limit) : 12;
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 12;
  const newestFirst = getClosedWeeks().slice().reverse();
  res.json(newestFirst.slice(0, limit));
});

router.get("/weeks/current", (_req, res) => {
  const state = getState();
  const openWeek = getOpenWeek();
  const receipts = state.receipts.filter((r) => r.weekId === openWeek.id);
  res.json({ ...openWeek, receipts });
});

router.post("/weeks/current/close", (_req, res) => {
  const state = getState();
  const openWeek = getOpenWeek();
  const isFirstWeek = getClosedWeeks().length === 0;
  const baselineGoingIn = state.streak.baselineKg;

  const result = closeWeek({
    totalKg: openWeek.totalKg,
    baselineKg: baselineGoingIn,
    streak: state.streak,
    hasCoveringOffset: hasCoveringOffset(openWeek.id),
    isFirstWeek,
  });

  openWeek.closed = true;
  openWeek.status = result.status;
  openWeek.outcome = result.outcome;
  openWeek.baselineAtClose = isFirstWeek ? openWeek.totalKg : baselineGoingIn;
  openWeek.limitAtClose = result.limitKg;
  state.streak = result.streak;

  const nextWindow = shiftWeekWindow(
    { startDate: openWeek.startDate, endDate: openWeek.endDate },
    1,
  );
  const newOpenWeek: Week = {
    id: makeId("week"),
    startDate: nextWindow.startDate,
    endDate: nextWindow.endDate,
    totalKg: 0,
    baselineAtClose: result.newBaselineKg,
    limitAtClose: result.limitKg,
    status: "within",
    outcome: "open",
    closed: false,
  };
  state.weeks.push(newOpenWeek);

  const response: CloseWeekResponse = {
    week: openWeek,
    streak: state.streak,
    newLow: result.newLow,
    outcome: result.outcome,
  };
  res.json(response);
});

export default router;
