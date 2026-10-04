import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { BarChart } from "@/components/BarChart";
import { CategoryBars } from "@/components/CategoryBars";
import { ScreenState } from "@/components/ScreenState";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Tile } from "@/components/Tile";
import { useStatsData } from "@/features/stats/useStatsData";
import { colors } from "@/lib/colors";
import { OUTCOME_COLOR, OUTCOME_LABEL } from "@/lib/outcome";
import { revealEntrance } from "@/lib/motion";

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
            <ScrollView
              contentContainerClassName="gap-5 px-5 pb-10 pt-4"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                entering={revealEntrance(0)}
                className="flex-row items-center justify-between"
              >
                <Text className="font-display text-2xl text-ink">
                  Footprint
                </Text>
                <View className="w-60">
                  <SegmentedControl
                    options={[
                      { value: "weekly", label: "Weekly" },
                      { value: "monthly", label: "Monthly" },
                    ]}
                    value={range}
                    onChange={setRange}
                  />
                </View>
              </Animated.View>

              {range === "monthly" ? (
                <MonthlyContent data={stats.data} />
              ) : (
                <WeeklyContent data={stats.data} />
              )}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </ScreenState>
    </View>
  );
}

function vsLabelColor(pct: number): string {
  return pct < 0 ? "text-leaf" : pct > 0 ? "text-ember" : "text-ink";
}

function WeeklyContent({
  data,
}: {
  data: NonNullable<ReturnType<typeof useStatsData>["data"]>;
}) {
  const {
    weeksOldestFirst,
    bestWeekKg,
    avg12wkKg,
    vsFirstWeekPct,
    categories,
  } = data;

  return (
    <>
      <Animated.View entering={revealEntrance(1)} className="flex-row gap-3">
        <Tile label="Best week, kg" value={bestWeekKg.toFixed(1)} />
        <Tile label="12-wk avg, kg" value={avg12wkKg.toFixed(1)} />
        <View className="flex-1 gap-1 rounded-tile bg-surface px-4 py-4">
          <Text
            className={`font-display text-2xl ${vsLabelColor(vsFirstWeekPct)}`}
          >
            {vsFirstWeekPct > 0 ? "+" : ""}
            {vsFirstWeekPct}%
          </Text>
          <Text className="font-body text-xs text-muted">vs first week</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={revealEntrance(2)}
        className="gap-4 rounded-card bg-surface px-5 py-5"
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-lg text-ink">Last 12 weeks</Text>
          <Text className="font-body text-xs text-muted">kg CO₂e</Text>
        </View>
        <BarChart
          items={weeksOldestFirst.map((w) => ({
            id: w.id,
            totalKg: w.totalKg,
            color: OUTCOME_COLOR[w.outcome],
          }))}
        />
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {LEGEND_OUTCOMES.map((outcome) => (
            <View key={outcome} className="flex-row items-center gap-1.5">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: OUTCOME_COLOR[outcome] }}
              />
              <Text className="font-body text-xs text-muted">
                {OUTCOME_LABEL[outcome]}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={revealEntrance(3)}
        className="gap-4 rounded-card bg-surface px-5 py-5"
      >
        <View className="gap-0.5">
          <Text className="font-display text-lg text-ink">
            Where it comes from
          </Text>
          <Text className="font-body text-xs text-muted">
            Average week, by category
          </Text>
        </View>
        <CategoryBars categories={categories} />
      </Animated.View>
    </>
  );
}

function MonthlyContent({
  data,
}: {
  data: NonNullable<ReturnType<typeof useStatsData>["data"]>;
}) {
  const { months, bestMonthKg, avgPerMonthKg, vsFirstMonthPct } = data.monthly;

  return (
    <>
      <Animated.View entering={revealEntrance(1)} className="flex-row gap-3">
        <Tile label="Best month, kg" value={bestMonthKg.toFixed(1)} />
        <Tile label="Avg/month, kg" value={avgPerMonthKg.toFixed(1)} />
        <View className="flex-1 gap-1 rounded-tile bg-surface px-4 py-4">
          <Text
            className={`font-display text-2xl ${vsLabelColor(vsFirstMonthPct)}`}
          >
            {vsFirstMonthPct > 0 ? "+" : ""}
            {vsFirstMonthPct}%
          </Text>
          <Text className="font-body text-xs text-muted">vs first month</Text>
        </View>
      </Animated.View>

      <Animated.View
        entering={revealEntrance(2)}
        className="gap-4 rounded-card bg-surface px-5 py-5"
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-lg text-ink">
            {months.length === 1
              ? "This month"
              : `Last ${months.length} months`}
          </Text>
          <Text className="font-body text-xs text-muted">kg CO₂e</Text>
        </View>
        <BarChart
          items={months.map((m) => ({
            id: m.key,
            totalKg: m.totalKg,
            color: colors.leaf,
            label: m.label,
          }))}
        />
      </Animated.View>
    </>
  );
}
