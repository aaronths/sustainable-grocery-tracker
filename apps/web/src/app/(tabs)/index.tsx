import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Leaf, TriangleAlert } from "lucide-react-native";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import type { WeekOutcome, WeekStatus } from "@/api/types";
import { BigNumber } from "@/components/BigNumber";
import { Meter } from "@/components/Meter";
import { OffsetSheet } from "@/components/OffsetSheet";
import { PastWeekCard } from "@/components/PastWeekCard";
import { SceneBackground } from "@/components/Scene";
import { ScreenState } from "@/components/ScreenState";
import { StatusCard } from "@/components/StatusCard";
import { StatusPill } from "@/components/StatusPill";
import { WeekNavPill } from "@/components/WeekNavPill";
import { colors } from "@/lib/colors";
import { useHomeData } from "@/features/home/useHomeData";
import { useWeekHistory } from "@/features/home/useWeekHistory";

// A streak the user is about to lose shouldn't be a quiet badge — flash it
// so it reads as urgent at a glance, the same way the StatusCard's "Over
// limit" button already owns this moment, just louder.
function AtRiskBadge() {
  const flash = useSharedValue(1);

  useEffect(() => {
    flash.value = withRepeat(
      withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [flash]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  return (
    <Animated.View
      style={animatedStyle}
      className="flex-row items-center gap-1 rounded-full bg-ember px-3 py-1"
    >
      <TriangleAlert size={12} color={colors.surface} />
      <Text className="font-body-medium text-xs text-surface">At risk</Text>
    </Animated.View>
  );
}

function formatWeekOf(startDate: string): string {
  return new Date(`${startDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

type ViewedWeek = {
  isCurrent: boolean;
  status: WeekStatus;
  outcome: WeekOutcome | null;
  total: number;
  baseline: number;
  limit: number;
  startDate: string;
  endDate: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const home = useHomeData();

  return (
    <View className="flex-1 bg-mist">
      <ScreenState
        loading={home.status === "loading"}
        error={home.status === "error" ? home.error : null}
        onRetry={home.refetch}
      >
        {home.data ? (
          <HomeContent
            data={home.data}
            home={home}
            onScan={() => router.push("/scan")}
            onViewReceipts={() => router.push("/receipts")}
          />
        ) : null}
      </ScreenState>
    </View>
  );
}

function HomeContent({
  data,
  home,
  onScan,
  onViewReceipts,
}: {
  data: NonNullable<ReturnType<typeof useHomeData>["data"]>;
  home: ReturnType<typeof useHomeData>;
  onScan: () => void;
  onViewReceipts: () => void;
}) {
  const { dashboard, quote, quoteError, offsetPurchased } = data;

  const history = useWeekHistory();
  const [weeksBack, setWeeksBack] = useState(0);
  const hasPrev = weeksBack < history.weeks.length;
  const hasNext = weeksBack > 0;

  const viewed = useMemo<ViewedWeek>(() => {
    if (weeksBack === 0) {
      return {
        isCurrent: true,
        status: dashboard.status,
        outcome: null,
        total: dashboard.total,
        baseline: dashboard.baseline,
        limit: dashboard.limit,
        startDate: dashboard.startDate,
        endDate: dashboard.endDate,
      };
    }
    const week = history.weeks[weeksBack - 1];
    return {
      isCurrent: false,
      status: week.status,
      outcome: week.outcome,
      total: week.totalKg,
      baseline: week.baselineAtClose,
      limit: week.limitAtClose,
      startDate: week.startDate,
      endDate: week.endDate,
    };
  }, [weeksBack, dashboard, history.weeks]);

  // A week whose emissions were fully offset reads as neutralized: show the
  // clean Forest scene regardless of the raw over-limit numbers underneath.
  const neutralized = viewed.isCurrent
    ? dashboard.status === "over" && offsetPurchased
    : viewed.outcome === "offset";
  const sceneStatus: WeekStatus = neutralized ? "below" : viewed.status;
  // The smog scene is dark enough that the default ink/muted text loses
  // contrast against it — swap to an off-white tone whenever it's showing.
  const readableOnSmog = sceneStatus === "over";
  // When the urgent merged "Over limit" + offset button is showing in
  // StatusCard, the separate small status pill would just repeat it.
  const showStatusPill = !(viewed.isCurrent && viewed.status === "over" && !offsetPurchased);
  const weekSubline = viewed.isCurrent
    ? dashboard.daysLeft === 0
      ? "Week closed Sunday"
      : `${dashboard.daysLeft} day${dashboard.daysLeft === 1 ? "" : "s"} left this week`
    : `Closed ${formatWeekOf(viewed.endDate)}`;

  return (
    <>
      <SceneBackground status={sceneStatus} />
      <SafeAreaView edges={["top"]} className="flex-1 gap-5 px-5 pb-4 pt-4">
        <View className="flex-row items-start justify-between">
          <WeekNavPill
            label={`Week of ${formatWeekOf(viewed.startDate)}`}
            sublabel={weekSubline}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={() => setWeeksBack((w) => w + 1)}
            onNext={() => setWeeksBack((w) => Math.max(0, w - 1))}
          />
          {viewed.isCurrent ? (
            <View className="items-end gap-1.5">
              <View className="flex-row items-center gap-1.5 rounded-full bg-surface px-4 py-2.5">
                <Leaf size={16} color={colors.leaf} />
                <Text className="font-display-medium text-base text-ink">{dashboard.streak}-week streak</Text>
              </View>
              {dashboard.status === "over" && !offsetPurchased ? <AtRiskBadge /> : null}
            </View>
          ) : null}
        </View>

        <View className="items-center gap-1">
          <Text
            className={`font-body-medium text-xs tracking-widest ${
              readableOnSmog ? "text-mist" : "text-muted"
            }`}
          >
            GROCERY EMISSIONS
          </Text>
          <BigNumber value={viewed.total} tone={readableOnSmog ? "mist" : "ink"} />
          <Text className={`font-body text-base ${readableOnSmog ? "text-mist" : "text-muted"}`}>
            kg CO₂e {viewed.isCurrent ? "this week" : "that week"}
          </Text>
          {showStatusPill ? (
            <View className="mt-2">
              <StatusPill status={viewed.status} isEmpty={viewed.isCurrent && viewed.total === 0} />
            </View>
          ) : null}
        </View>

        <Meter status={viewed.status} total={viewed.total} baseline={viewed.baseline} limit={viewed.limit} />

        {viewed.isCurrent ? (
          <StatusCard
            status={dashboard.status}
            total={dashboard.total}
            baseline={dashboard.baseline}
            headroomKg={dashboard.headroomKg}
            excessKg={dashboard.excessKg}
            daysLeft={dashboard.daysLeft}
            streak={dashboard.streak}
            quote={quote}
            quoteError={quoteError}
            offsetPurchased={offsetPurchased}
            onScanPress={onScan}
            onOffsetPress={home.openSheet}
            onViewReceiptsPress={onViewReceipts}
          />
        ) : (
          <PastWeekCard
            outcome={viewed.outcome!}
            total={viewed.total}
            baseline={viewed.baseline}
            limit={viewed.limit}
          />
        )}
      </SafeAreaView>

      <OffsetSheet
        visible={home.sheetOpen}
        onClose={home.closeSheet}
        streak={dashboard.streak}
        quote={quote}
        quoteError={quoteError}
        confirming={home.confirming}
        onConfirm={home.purchaseOffset}
        onRefreshQuote={home.refreshQuote}
      />
    </>
  );
}
