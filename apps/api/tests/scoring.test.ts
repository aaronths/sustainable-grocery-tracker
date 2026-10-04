import { describe, expect, it } from "vitest";
import {
  closeWeek,
  computeLimit,
  computeOffsetQuote,
  computeStatus,
  type CloseWeekInput,
} from "../src/domain/scoring";
import type { StreakState } from "../src/domain/types";

function streak(overrides: Partial<StreakState> = {}): StreakState {
  return { current: 5, best: 8, baselineKg: 30, savesUsed: 0, ...overrides };
}

function baseInput(overrides: Partial<CloseWeekInput> = {}): CloseWeekInput {
  return {
    totalKg: 30,
    baselineKg: 30,
    streak: streak(),
    hasCoveringOffset: false,
    isFirstWeek: false,
    ...overrides,
  };
}

describe("computeLimit / computeStatus", () => {
  it("limit is baseline x 1.10", () => {
    expect(computeLimit(100)).toBe(110);
    expect(computeLimit(28.4)).toBe(31.2);
  });

  it("exactly +10% is within", () => {
    expect(computeStatus(110, 100, 110)).toBe("within");
  });

  it("anything above +10% is over", () => {
    expect(computeStatus(110.1, 100, 110)).toBe("over");
  });

  it("below baseline is below", () => {
    expect(computeStatus(99.9, 100, 110)).toBe("below");
  });
});

describe("closeWeek", () => {
  it("first week sets the baseline and keeps the streak", () => {
    const result = closeWeek(baseInput({ totalKg: 40, isFirstWeek: true, streak: streak({ current: 0, best: 0 }) }));
    expect(result.outcome).toBe("kept");
    expect(result.newBaselineKg).toBe(40);
    expect(result.streak.current).toBe(1);
    expect(result.streak.best).toBe(1);
  });

  it("a new low resets the baseline to the lower total", () => {
    const result = closeWeek(baseInput({ totalKg: 25, baselineKg: 30 }));
    expect(result.outcome).toBe("new_low");
    expect(result.status).toBe("below");
    expect(result.newBaselineKg).toBe(25);
    expect(result.streak.current).toBe(6);
  });

  it("exactly +10% over baseline is kept, not broken", () => {
    const result = closeWeek(baseInput({ totalKg: 33, baselineKg: 30 })); // limit = 33
    expect(result.status).toBe("within");
    expect(result.outcome).toBe("kept");
    expect(result.newBaselineKg).toBe(30);
    expect(result.streak.current).toBe(6);
  });

  it("just above +10% over baseline is over", () => {
    const result = closeWeek(baseInput({ totalKg: 33.1, baselineKg: 30, hasCoveringOffset: false }));
    expect(result.status).toBe("over");
  });

  it("an offset covering the excess keeps the streak and uses a save", () => {
    const result = closeWeek(
      baseInput({ totalKg: 36, baselineKg: 30, hasCoveringOffset: true, streak: streak({ current: 5, savesUsed: 2 }) }),
    );
    expect(result.outcome).toBe("offset");
    expect(result.status).toBe("over");
    expect(result.newLow).toBe(false);
    expect(result.newBaselineKg).toBe(30); // baseline unchanged
    expect(result.streak.current).toBe(6);
    expect(result.streak.savesUsed).toBe(3);
  });

  it("no covering offset breaks the streak and resets current to 0", () => {
    const result = closeWeek(
      baseInput({ totalKg: 36, baselineKg: 30, hasCoveringOffset: false, streak: streak({ current: 5, best: 9 }) }),
    );
    expect(result.outcome).toBe("broken");
    expect(result.streak.current).toBe(0);
    expect(result.streak.best).toBe(9); // best is untouched by a break
  });
});

describe("computeOffsetQuote", () => {
  it("returns null when the week is not over its limit", () => {
    expect(computeOffsetQuote(100, 100, 4000)).toBeNull();
    expect(computeOffsetQuote(90, 100, 4000)).toBeNull();
  });

  it("computes cost from the excess at the given price per tonne", () => {
    const quote = computeOffsetQuote(131, 100, 4000); // 31kg excess
    expect(quote).not.toBeNull();
    expect(quote!.excessKg).toBe(31);
    expect(quote!.costCents).toBe(124); // 31/1000 * 4000
  });

  it("rounds the 5% fee using round-half-up", () => {
    const quote = computeOffsetQuote(112.5, 100, 4000); // 12.5kg excess -> 50c cost
    expect(quote).not.toBeNull();
    expect(quote!.excessKg).toBe(12.5);
    expect(quote!.costCents).toBe(50);
    expect(quote!.feeCents).toBe(3); // round(50 * 0.05) = round(2.5) = 3
    expect(quote!.totalCents).toBe(53);
  });
});
