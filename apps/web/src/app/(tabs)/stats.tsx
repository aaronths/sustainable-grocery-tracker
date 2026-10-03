import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BarChart } from "@/components/BarChart";
import { CategoryBars } from "@/components/CategoryBars";
import { ScreenState } from "@/components/ScreenState";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Tile } from "@/components/Tile";
import { useStatsData } from "@/features/stats/useStatsData";
import { OUTCOME_COLOR, OUTCOME_LABEL } from "@/lib/outcome";

const LEGEND_OUTCOMES = ["new_low", "kept", "offset"] as const;

export default function StatsScreen() {
  const stats = useStatsData();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");

  return (
    <View className="flex-1 bg-mist">
      <ScreenState
        loading={stats.status === "loading"}
        error={stats.status === "error" ? stats.error : null}
        onRetry={stats.refetch}
      >
        {stats.data ? (
          <SafeAreaView edges={["top"]} className="flex-1">
            <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center justify-between">
                <Text className="font-display text-2xl text-ink">Footprint</Text>
                <View className="w-44">
                  <SegmentedControl
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                    value={range}
                    onChange={setRange}
                  />
                </View>
              </View>

              {range === "monthly" ? (
                <View className="rounded-card bg-surface px-5 py-6">
                  <Text className="text-center font-body text-muted">
                    Monthly view coming soon.
                  </Text>
                </View>
              ) : (
                <StatsContent data={stats.data} />
              )}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </ScreenState>
    </View>
  );
}

function StatsContent({ data }: { data: NonNullable<ReturnType<typeof useStatsData>["data"]> }) {
  const { weeksOldestFirst, bestWeekKg, avg12wkKg, vsFirstWeekPct, categories } = data;
  const vsFirstColor = vsFirstWeekPct < 0 ? "text-leaf" : vsFirstWeekPct > 0 ? "text-ember" : "text-ink";

  return (
    <>
      <View className="flex-row gap-3">
        <Tile label="Best week, kg" value={bestWeekKg.toFixed(1)} />
        <Tile label="12-wk avg, kg" value={avg12wkKg.toFixed(1)} />
        <View className="flex-1 gap-1 rounded-tile bg-surface px-4 py-4">
          <Text className={`font-display text-2xl ${vsFirstColor}`}>
            {vsFirstWeekPct > 0 ? "+" : ""}
            {vsFirstWeekPct}%
          </Text>
          <Text className="font-body text-xs text-muted">vs first week</Text>
        </View>
      </View>

      <View className="gap-4 rounded-card bg-surface px-5 py-5">
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-lg text-ink">Last 12 weeks</Text>
          <Text className="font-body text-xs text-muted">kg CO₂e</Text>
        </View>
        <BarChart weeks={weeksOldestFirst.map((w) => ({ id: w.id, totalKg: w.totalKg, outcome: w.outcome }))} />
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {LEGEND_OUTCOMES.map((outcome) => (
            <View key={outcome} className="flex-row items-center gap-1.5">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: OUTCOME_COLOR[outcome] }} />
              <Text className="font-body text-xs text-muted">{OUTCOME_LABEL[outcome]}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-4 rounded-card bg-surface px-5 py-5">
        <View className="gap-0.5">
          <Text className="font-display text-lg text-ink">Where it comes from</Text>
          <Text className="font-body text-xs text-muted">Average week, by category</Text>
        </View>
        <CategoryBars categories={categories} />
      </View>
    </>
  );
}
