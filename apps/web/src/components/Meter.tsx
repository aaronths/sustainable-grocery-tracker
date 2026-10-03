import { Text, View } from "react-native";

import type { WeekStatus } from "@/api/types";
import { colors } from "@/lib/colors";

type MeterProps = {
  status: WeekStatus;
  total: number;
  baseline: number;
  limit: number;
};

const FILL_COLOR: Record<WeekStatus, string> = {
  below: colors.leaf,
  within: colors.sage,
  over: colors.ember,
};

export function Meter({ status, total, baseline, limit }: MeterProps) {
  const trackMax = Math.max(limit, total) * 1.25;
  const fillPct = Math.min(100, (total / trackMax) * 100);
  const baselineTickPct = Math.min(100, (baseline / trackMax) * 100);
  const limitTickPct = Math.min(100, (limit / trackMax) * 100);

  const legend =
    status === "below"
      ? `Baseline ${total} kg (was ${baseline}) · Limit ${limit} kg (+10%)`
      : `Baseline ${baseline} kg · Limit ${limit} kg (+10%)`;

  return (
    <View className="w-full gap-2 rounded-card bg-surface/90 px-5 py-4">
      <View className="h-2 w-full overflow-hidden rounded-full bg-sage/30">
        <View
          className="h-full rounded-full"
          style={{ width: `${fillPct}%`, backgroundColor: FILL_COLOR[status] }}
        />
        <View
          className="absolute h-2 w-0.5 bg-ink"
          style={{ left: `${baselineTickPct}%` }}
        />
        <View
          className="absolute h-2 w-0.5 bg-muted/50"
          style={{ left: `${limitTickPct}%` }}
        />
      </View>
      <Text className="font-body text-sm text-muted">{legend}</Text>
    </View>
  );
}
