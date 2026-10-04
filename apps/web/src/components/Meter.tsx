import { Text, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";

import type { WeekStatus } from "@/api/types";
import { colors } from "@/lib/colors";

type MeterProps = {
  status: WeekStatus;
  total: number;
  baseline: number;
  limit: number;
};

// The bar's full length *is* the limit now (not a padded scale with a limit
// tick on it), so its fill color is driven purely by how much of that limit
// is used up — independent of WeekStatus, which only still matters for the
// "(was baseline)" legend wording below.
function fillColorForPct(pct: number): string {
  if (pct > 100) return colors.maroon;
  if (pct >= 80) return colors.orange;
  if (pct >= 60) return colors.amber;
  return colors.leaf;
}

export function Meter({ status, total, baseline, limit }: MeterProps) {
  const pct = limit > 0 ? (total / limit) * 100 : 0;
  const exceeded = pct > 100;
  const fillPct = Math.min(100, Math.max(0, pct));
  const fillColor = fillColorForPct(pct);

  const legend = exceeded
    ? "Limit exceeded"
    : status === "below"
    ? `Baseline ${total} kg (was ${baseline}) · Limit ${limit} kg (+10%)`
    : `Baseline ${baseline} kg · Limit ${limit} kg (+10%)`;

  return (
    <View
      className="w-full gap-3 rounded-card bg-surface px-5 py-3"
      style={{
        shadowColor: colors.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-body-medium text-sm text-muted">
          Weekly limit
        </Text>
        <Text className="font-display text-xl" style={{ color: fillColor }}>
          {Math.round(pct)}%
        </Text>
      </View>

      <View className="h-6 w-full overflow-hidden rounded-full bg-sage/25">
        <View
          className="h-full rounded-full"
          style={{ width: `${fillPct}%`, backgroundColor: fillColor }}
        />
      </View>

      <View className="flex-row items-center gap-1.5">
        {exceeded ? <TriangleAlert size={14} color={colors.maroon} /> : null}
        <Text
          className="font-body-medium text-sm"
          style={{ color: exceeded ? colors.maroon : colors.muted }}
        >
          {legend}
        </Text>
      </View>
    </View>
  );
}
