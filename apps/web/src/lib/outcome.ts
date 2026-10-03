import type { WeekOutcome } from "@/api/types";
import { colors } from "./colors";

export const OUTCOME_COLOR: Record<WeekOutcome, string> = {
  new_low: colors.leaf,
  kept: colors.sage,
  offset: colors.ember,
  broken: colors.smog,
  open: colors.sage,
};

export const OUTCOME_LABEL: Record<WeekOutcome, string> = {
  new_low: "New low",
  kept: "Within baseline",
  offset: "Offset",
  broken: "Broken",
  open: "Open",
};
