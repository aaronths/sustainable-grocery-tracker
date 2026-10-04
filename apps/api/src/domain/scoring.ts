import type { StreakState, WeekOutcome, WeekStatus } from "./types";

/**
 * Pure domain logic: baseline, limit, status, week-close streak rules and
 * offset-quote math. No Express imports here so this stays unit-testable
 * and is the one place to change if, e.g., the baseline rule moves to a
 * rolling average.
 */

export const DEFAULT_OFFSET_PRICE_PER_TONNE_CENTS = Number(
  process.env.OFFSET_PRICE_PER_TONNE_CENTS ?? 4000,
);

export const OFFSET_QUOTE_TTL_MS = 15 * 60 * 1000;

/** Below this, a parsed line item's own estimate is treated as unreliable. */
export const LOW_CONFIDENCE_THRESHOLD = 0.7;

export const WEEK_TIMEZONE = "America/Detroit";

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeLimit(baselineKg: number): number {
  return round1(baselineKg * 1.1);
}

export function computeStatus(totalKg: number, baselineKg: number, limitKg: number): WeekStatus {
  if (totalKg < baselineKg) return "below";
  if (totalKg <= limitKg) return "within";
  return "over";
}

export interface CloseWeekInput {
  totalKg: number;
  baselineKg: number;
  streak: StreakState;
  hasCoveringOffset: boolean;
  isFirstWeek: boolean;
}

export interface CloseWeekResult {
  outcome: WeekOutcome;
  status: WeekStatus;
  newBaselineKg: number;
  limitKg: number;
  streak: StreakState;
  newLow: boolean;
}

export function closeWeek(input: CloseWeekInput): CloseWeekResult {
  const { totalKg, baselineKg, streak, hasCoveringOffset, isFirstWeek } = input;

  if (isFirstWeek) {
    const current = streak.current + 1;
    return {
      outcome: "kept",
      status: "within",
      newBaselineKg: totalKg,
      limitKg: computeLimit(totalKg),
      newLow: false,
      streak: {
        current,
        best: Math.max(streak.best, current),
        baselineKg: totalKg,
        savesUsed: streak.savesUsed,
      },
    };
  }

  const limitKg = computeLimit(baselineKg);
  const status = computeStatus(totalKg, baselineKg, limitKg);

  if (status === "below") {
    const current = streak.current + 1;
    return {
      outcome: "new_low",
      status,
      newBaselineKg: totalKg,
      limitKg,
      newLow: true,
      streak: {
        current,
        best: Math.max(streak.best, current),
        baselineKg: totalKg,
        savesUsed: streak.savesUsed,
      },
    };
  }

  if (status === "within") {
    const current = streak.current + 1;
    return {
      outcome: "kept",
      status,
      newBaselineKg: baselineKg,
      limitKg,
      newLow: false,
      streak: {
        current,
        best: Math.max(streak.best, current),
        baselineKg,
        savesUsed: streak.savesUsed,
      },
    };
  }

  // status === "over"
  if (hasCoveringOffset) {
    const current = streak.current + 1;
    return {
      outcome: "offset",
      status,
      newBaselineKg: baselineKg,
      limitKg,
      newLow: false,
      streak: {
        current,
        best: Math.max(streak.best, current),
        baselineKg,
        savesUsed: streak.savesUsed + 1,
      },
    };
  }

  return {
    outcome: "broken",
    status,
    newBaselineKg: baselineKg,
    limitKg,
    newLow: false,
    streak: {
      current: 0,
      best: streak.best,
      baselineKg,
      savesUsed: streak.savesUsed,
    },
  };
}

export interface OffsetQuoteCalc {
  kg: number;
  costCents: number;
  feeCents: number;
  totalCents: number;
}

/**
 * Prices offsetting the week's entire footprint (not just the portion over
 * the limit) — fully neutralizes the week rather than just covering the
 * overage. Still gated on being over the limit (caller maps a null to 400
 * NOT_OVER_LIMIT): a week within its limit has nothing to offset.
 */
export function computeOffsetQuote(
  totalKg: number,
  limitKg: number,
  pricePerTonneCents: number = DEFAULT_OFFSET_PRICE_PER_TONNE_CENTS,
): OffsetQuoteCalc | null {
  if (totalKg <= limitKg) return null;

  const costCents = Math.round((totalKg / 1000) * pricePerTonneCents);
  const feeCents = Math.round(costCents * 0.05);
  return {
    kg: round1(totalKg),
    costCents,
    feeCents,
    totalCents: costCents + feeCents,
  };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getZonedDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: WEEK_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekdayIndex: WEEKDAYS.indexOf(map.weekday),
  };
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface WeekWindow {
  startDate: string;
  endDate: string;
}

/** Monday-to-Sunday window containing `now`, computed in America/Detroit. */
export function getWeekWindow(now: Date = new Date()): WeekWindow {
  const { year, month, day, weekdayIndex } = getZonedDateParts(now);
  const daysSinceMonday = (weekdayIndex + 6) % 7; // Sun(0)->6, Mon(1)->0, ... Sat(6)->5

  const monday = new Date(Date.UTC(year, month - 1, day));
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  return { startDate: toISODate(monday), endDate: toISODate(sunday) };
}

/** Shifts a week window back by `weeks` whole weeks (weeks=1 -> the previous week). */
export function shiftWeekWindow(window: WeekWindow, weeks: number): WeekWindow {
  const monday = new Date(`${window.startDate}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + weeks * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { startDate: toISODate(monday), endDate: toISODate(sunday) };
}

/** Days remaining in the current week (today through Sunday, inclusive), in America/Detroit. */
export function daysLeftInWeek(now: Date = new Date()): number {
  const { year, month, day } = getZonedDateParts(now);
  const { endDate } = getWeekWindow(now);
  const todayUTC = Date.UTC(year, month - 1, day);
  const endUTC = new Date(`${endDate}T00:00:00Z`).getTime();
  const diffDays = Math.round((endUTC - todayUTC) / 86_400_000);
  return Math.max(0, diffDays + 1);
}
