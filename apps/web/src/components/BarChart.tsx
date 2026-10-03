import { View } from "react-native";

import type { WeekOutcome } from "@/api/types";
import { OUTCOME_COLOR } from "@/lib/outcome";

export type BarChartWeek = {
  id: string;
  totalKg: number;
  outcome: WeekOutcome;
};

type BarChartProps = {
  weeks: BarChartWeek[];
  maxKg?: number;
  height?: number;
};

export function BarChart({ weeks, maxKg, height = 160 }: BarChartProps) {
  const max = maxKg ?? Math.max(...weeks.map((w) => w.totalKg), 1);

  return (
    <View className="flex-row items-end gap-1.5" style={{ height }}>
      {weeks.map((week) => {
        const barHeight = Math.max(4, (week.totalKg / max) * height);
        return (
          <View key={week.id} className="flex-1 items-center justify-end" style={{ height }}>
            <View
              className="w-full rounded-full"
              style={{ height: barHeight, backgroundColor: OUTCOME_COLOR[week.outcome] }}
            />
          </View>
        );
      })}
    </View>
  );
}
