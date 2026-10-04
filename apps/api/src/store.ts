import { buildSeed, type StoreState } from "./seed";
import { round1 } from "./domain/scoring";
import type { Receipt, Week } from "./domain/types";

let state: StoreState = buildSeed();

export function getState(): StoreState {
  return state;
}

export function resetStore(): StoreState {
  state = buildSeed();
  return state;
}

export function getOpenWeek(): Week {
  const open = state.weeks.find((w) => !w.closed);
  if (!open) throw new Error("Store invariant violated: no open week");
  return open;
}

export function getClosedWeeks(): Week[] {
  return state.weeks.filter((w) => w.closed);
}

export function findWeek(id: string): Week | undefined {
  return state.weeks.find((w) => w.id === id);
}

export function findReceipt(id: string): Receipt | undefined {
  return state.receipts.find((r) => r.id === id);
}

/** Recomputes the open week's total from its confirmed receipts' line items. */
export function recomputeOpenWeekTotal(): Week {
  const openWeek = getOpenWeek();
  const total = state.receipts
    .filter((r) => r.weekId === openWeek.id && r.status === "confirmed")
    .flatMap((r) => r.items)
    .reduce((sum, item) => sum + item.kgCo2e, 0);
  openWeek.totalKg = round1(total);
  return openWeek;
}

export function hasCoveringOffset(weekId: string): boolean {
  return state.offsets.some((o) => o.weekId === weekId);
}
