import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";

import { ScreenState } from "@/components/ScreenState";
import { useSwapsData } from "@/features/swaps/useSwapsData";
import { revealEntrance } from "@/lib/motion";
import type { Swap } from "@/api/types";

export default function SwapsScreen() {
  const swaps = useSwapsData();

  return (
    <View className="flex-1 bg-mist">
      <ScreenState
        loading={swaps.status === "loading"}
        error={swaps.status === "error" ? swaps.error : null}
        onRetry={swaps.refetch}
      >
        {swaps.data ? (
          <SafeAreaView edges={["top"]} className="flex-1">
            <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
              <Animated.View entering={revealEntrance(0)} className="gap-0.5">
                <Text className="font-display text-2xl text-ink">Next swaps</Text>
                <Text className="font-body text-sm text-muted">From your last 3 receipts</Text>
              </Animated.View>

              {swaps.data.hero ? (
                <Animated.View entering={revealEntrance(1)}>
                  <HeroCard swap={swaps.data.hero} onCommit={() => swaps.commit(swaps.data!.hero!.id)} />
                </Animated.View>
              ) : null}

              {swaps.data.rest.length > 0 ? (
                <Animated.View entering={revealEntrance(2)} className="gap-0.5 rounded-card bg-surface px-5 py-2">
                  <Text className="px-0 pb-2 pt-3 font-display text-lg text-ink">More ideas</Text>
                  {swaps.data.rest.map((swap, i) => (
                    <SwapRow
                      key={swap.id}
                      swap={swap}
                      isLast={i === swaps.data!.rest.length - 1}
                      onCommit={() => swaps.commit(swap.id)}
                    />
                  ))}
                </Animated.View>
              ) : null}

              {swaps.data.challenge ? (
                <Animated.View entering={revealEntrance(3)}>
                  <ChallengeCard
                    title={swaps.data.challenge.title}
                    progress={swaps.data.challenge.progress}
                    target={swaps.data.challenge.target}
                    daysLeft={swaps.data.daysLeft}
                  />
                </Animated.View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </ScreenState>
    </View>
  );
}

function HeroCard({ swap, onCommit }: { swap: Swap; onCommit: () => void }) {
  return (
    <View className="gap-3 rounded-card bg-moss px-5 py-5">
      <Text className="font-body-medium text-xs tracking-widest text-surface/70">
        BIGGEST WIN THIS WEEK
      </Text>
      <View>
        <Text className="font-display text-2xl text-surface">{swap.fromName} →</Text>
        <Text className="font-display text-2xl text-surface">{swap.toName}</Text>
      </View>
      <Text className="font-body text-base text-surface/90">
        {swap.context}. About {swap.savingKg} kg CO₂e less per week.
      </Text>
      <Pressable
        onPress={onCommit}
        disabled={swap.committed}
        className="min-h-[44px] items-center justify-center rounded-btn bg-surface px-5 py-3"
        style={{ opacity: swap.committed ? 0.6 : 1 }}
      >
        <Text className="font-body-medium text-moss">
          {swap.committed ? "Added to this week" : "Add to this week"}
        </Text>
      </Pressable>
    </View>
  );
}

function SwapRow({ swap, isLast, onCommit }: { swap: Swap; isLast: boolean; onCommit: () => void }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${isLast ? "" : "border-b border-sage/25"}`}
    >
      <View className="flex-1 pr-3">
        <Text className="font-body-medium text-ink">
          {swap.fromName} → {swap.toName}
        </Text>
        <Text className="font-body text-sm text-muted">{swap.context}</Text>
      </View>
      <View className="flex-row items-center gap-3">
        <Text className="font-body-medium text-leaf">−{swap.savingKg} kg</Text>
        <Pressable
          onPress={onCommit}
          disabled={swap.committed}
          className="min-h-[36px] items-center justify-center rounded-full border border-moss px-4 py-1.5"
          style={{ opacity: swap.committed ? 0.5 : 1 }}
        >
          <Text className="font-body-medium text-moss">{swap.committed ? "Added" : "Try"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ChallengeCard({
  title,
  progress,
  target,
  daysLeft,
}: {
  title: string;
  progress: number;
  target: number;
  daysLeft: number;
}) {
  const pct = Math.min(100, (progress / target) * 100);
  return (
    <View className="gap-2 rounded-card bg-sage/30 px-5 py-5">
      <Text className="font-body-medium text-xs tracking-widest text-muted">WEEKLY CHALLENGE</Text>
      <Text className="font-display text-lg text-ink">{title}</Text>
      <Text className="font-body text-sm text-muted">
        {progress} of {target} done · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
      </Text>
      <View className="h-2 w-full overflow-hidden rounded-full bg-surface/60">
        <View className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
