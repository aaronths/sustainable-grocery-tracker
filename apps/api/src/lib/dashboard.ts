import { getOpenWeek, getState } from "../store";
import { computeLimit, computeStatus, daysLeftInWeek, round1 } from "../domain/scoring";
import type { DashboardResponse } from "../domain/types";

export function buildDashboard(now: Date = new Date()): DashboardResponse {
  const { streak } = getState();
  const openWeek = getOpenWeek();
  const baseline = streak.baselineKg;
  const limit = computeLimit(baseline);
  const total = openWeek.totalKg;
  const status = computeStatus(total, baseline, limit);
  openWeek.status = status;

  return {
    weekId: openWeek.id,
    startDate: openWeek.startDate,
    endDate: openWeek.endDate,
    total,
    baseline,
    limit,
    status,
    headroomKg: round1(Math.max(0, limit - total)),
    excessKg: round1(Math.max(0, total - limit)),
    streak: streak.current,
    daysLeft: daysLeftInWeek(now),
  };
}
