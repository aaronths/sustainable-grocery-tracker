// Mirrors apps/api/src/domain/scoring.ts's round1 — needed for a couple of
// client-side derived values (see StatusCard, useStatsData).
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
