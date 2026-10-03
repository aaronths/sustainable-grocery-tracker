import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Leaf } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { WeekOutcome, WeekStatus } from "@/api/types";
import { BigNumber } from "@/components/BigNumber";
import { Meter } from "@/components/Meter";
import { OffsetSheet } from "@/components/OffsetSheet";
import { PastWeekCard } from "@/components/PastWeekCard";
import { ReceiptsSheet } from "@/components/ReceiptsSheet";
import { ScreenState } from "@/components/ScreenState";
import { Forest, Plains, Smog } from "@/components/Scene";
import { StatusCard } from "@/components/StatusCard";
import { StatusPill } from "@/components/StatusPill";
import { WeekNavPill } from "@/components/WeekNavPill";
import { colors } from "@/lib/colors";
import { useHomeData } from "@/features/home/useHomeData";
import { useWeekHistory } from "@/features/home/useWeekHistory";
import { useReceiptsData } from "@/features/receipts/useReceiptsData";

const SCENE = { below: Forest, within: Plains, over: Smog };

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
        {home.data ? <HomeContent data={home.data} home={home} onScan={() => router.push("/scan")} /> : null}
      </ScreenState>
    </View>
  );
}

function HomeContent({
  data,
  home,
  onScan,
}: {
  data: NonNullable<ReturnType<typeof useHomeData>["data"]>;
  home: ReturnType<typeof useHomeData>;
  onScan: () => void;
}) {
  const { dashboard, quote, quoteError, offsetPurchased } = data;
  const [receiptsOpen, setReceiptsOpen] = useState(false);
  const receipts = useReceiptsData(receiptsOpen, home.refetch);

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

  const Scene = SCENE[viewed.status];
  const streakLabel =
    dashboard.status === "over" ? `${dashboard.streak} weeks · at risk` : `${dashboard.streak}-week streak`;
  const weekSubline = viewed.isCurrent
    ? dashboard.daysLeft === 0
      ? "Week closed Sunday"
      : `${dashboard.daysLeft} day${dashboard.daysLeft === 1 ? "" : "s"} left this week`
    : `Closed ${formatWeekOf(viewed.endDate)}`;

  return (
    <>
      <Scene />
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
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
              <View className="flex-row items-center gap-1.5 rounded-full bg-surface/80 px-4 py-2.5">
                <Leaf size={14} color={colors.leaf} />
                <Text className="font-body-medium text-sm text-ink">{streakLabel}</Text>
              </View>
            ) : null}
          </View>

          <View className="items-center gap-1 py-6">
            <Text className="font-body-medium text-xs tracking-widest text-muted">
              GROCERY EMISSIONS
            </Text>
            <BigNumber value={viewed.total} />
            <Text className="font-body text-base text-muted">
              kg CO₂e {viewed.isCurrent ? "this week" : "that week"}
            </Text>
            <View className="mt-2">
              <StatusPill status={viewed.status} />
            </View>
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
              onViewReceiptsPress={() => setReceiptsOpen(true)}
            />
          ) : (
            <PastWeekCard
              outcome={viewed.outcome!}
              total={viewed.total}
              baseline={viewed.baseline}
              limit={viewed.limit}
            />
          )}
        </ScrollView>
      </SafeAreaView>

      <OffsetSheet
        visible={home.sheetOpen}
        onClose={home.closeSheet}
        streak={dashboard.streak}
        limitKg={dashboard.limit}
        quote={quote}
        quoteError={quoteError}
        confirming={home.confirming}
        onConfirm={home.purchaseOffset}
        onRefreshQuote={home.refreshQuote}
      />

      <ReceiptsSheet
        visible={receiptsOpen}
        onClose={() => setReceiptsOpen(false)}
        receipts={receipts.receipts}
        loading={receipts.status === "loading"}
        error={receipts.status === "error" ? receipts.error : null}
        deletingId={receipts.deletingId}
        onRetry={receipts.refetch}
        onDelete={receipts.remove}
      />
    </>
  );
}
