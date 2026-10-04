import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/api/client";
import { postChallengeProgress, postHealthLink } from "@/api/resources";
import type { Swap } from "@/api/types";
import { ChallengeProgressSheet } from "@/components/ChallengeProgressSheet";
import { HealthRecommendations } from "@/components/HealthRecommendations";
import { MacroBars } from "@/components/MacroBars";
import { ScreenState } from "@/components/ScreenState";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Tile } from "@/components/Tile";
import { useActionsData } from "@/features/insights/useActionsData";
import { useHealthData } from "@/features/insights/useHealthData";
import { colors } from "@/lib/colors";

type InsightsView = "actions" | "health";

const VIEW_OPTIONS: { value: InsightsView; label: string }[] = [
  { value: "actions", label: "Actions" },
  { value: "health", label: "Health" },
];

export default function InsightsScreen() {
  const [view, setView] = useState<InsightsView>("actions");
  const health = useHealthData();

  return (
    <View className="flex-1 bg-mist">
      <SafeAreaView edges={["top"]} className="flex-1">
        <View className="flex-row items-start justify-between px-5 pb-2 pt-4">
          <View className="gap-5">
            <Text className="font-display text-2xl text-ink">Insights</Text>
            <View className="w-44">
              <SegmentedControl
                options={VIEW_OPTIONS}
                value={view}
                onChange={setView}
              />
            </View>
          </View>

          <HealthLinkButton
            linked={health.data?.linked ?? false}
            onLinked={health.refetch}
          />
        </View>

        {view === "actions" ? (
          <ActionsContent />
        ) : (
          <HealthContent health={health} />
        )}
      </SafeAreaView>
    </View>
  );
}

function HealthLinkButton({
  linked,
  onLinked,
}: {
  linked: boolean;
  onLinked: () => void;
}) {
  const [linking, setLinking] = useState(false);

  const link = async () => {
    setLinking(true);
    try {
      await postHealthLink();
      onLinked();
    } catch {
      // Best-effort — the button just stays "Link Health Records" to retry.
    } finally {
      setLinking(false);
    }
  };

  return (
    <Pressable
      onPress={link}
      disabled={linking || linked}
      className={`items-end gap-0.5 ${linked ? "" : "active:opacity-70"}`}
    >
      <View
        className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
          linked ? "bg-sage/30" : "bg-moss"
        }`}
      >
        {linking ? (
          <ActivityIndicator
            size="small"
            color={linked ? colors.ink : colors.surface}
          />
        ) : null}
        <Text
          className={`font-body-medium text-xs ${
            linked ? "text-ink" : "text-surface"
          }`}
        >
          {linking
            ? "Linking…"
            : linked
            ? "Health Records Linked"
            : "Link Health Records"}
        </Text>
      </View>
      {linked ? (
        <Text className="font-body text-[10px] text-muted">
          Powered by Finchnode
        </Text>
      ) : null}
    </Pressable>
  );
}

function ActionsContent() {
  const actions = useActionsData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const logProgress = async () => {
    const challenge = actions.data?.challenge;
    if (!challenge) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await postChallengeProgress(challenge.id);
      actions.setChallenge(updated);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "Couldn't log that — try again"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1">
      <ScreenState
        loading={actions.status === "loading"}
        error={actions.status === "error" ? actions.error : null}
        onRetry={actions.refetch}
      >
        {actions.data ? (
          <ScrollView
            contentContainerClassName="gap-5 px-5 pb-10 pt-2"
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-0.5">
              <Text className="font-display text-lg text-ink">Next swaps</Text>
              <Text className="font-body text-sm text-muted">
                From this week's confirmed receipts
              </Text>
            </View>

            {actions.data.hero ? (
              <HeroCard swap={actions.data.hero} />
            ) : (
              <HeroCardEmpty />
            )}

            {actions.data.rest.length > 0 ? (
              <View className="gap-0.5 rounded-card bg-surface px-5 py-2">
                <Text className="px-0 pb-2 pt-3 font-display text-lg text-ink">
                  More ideas
                </Text>
                {actions.data.rest.map((swap, i) => (
                  <SwapRow
                    key={swap.id}
                    swap={swap}
                    isLast={i === actions.data!.rest.length - 1}
                  />
                ))}
              </View>
            ) : null}

            {actions.data.challenge ? (
              <ChallengeCard
                title={actions.data.challenge.title}
                progress={actions.data.challenge.progress}
                target={actions.data.challenge.target}
                daysLeft={actions.data.daysLeft}
                onPress={() => setSheetOpen(true)}
              />
            ) : null}
          </ScrollView>
        ) : null}
      </ScreenState>

      <ChallengeProgressSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        challenge={actions.data?.challenge ?? null}
        submitting={submitting}
        submitError={submitError}
        onSubmit={logProgress}
      />
    </View>
  );
}

function HeroCard({ swap }: { swap: Swap }) {
  return (
    <View className="gap-3 rounded-card bg-moss px-5 py-5">
      <Text className="font-body-medium text-xs tracking-widest text-surface/70">
        BIGGEST WIN THIS WEEK
      </Text>
      <View>
        <Text className="font-display text-2xl text-surface">
          {swap.fromName} →
        </Text>
        <Text className="font-display text-2xl text-surface">
          {swap.toName}
        </Text>
      </View>
      <Text className="font-body text-base text-surface/90">
        {swap.context}. About {swap.savingKg} kg CO₂e less per week.
      </Text>
    </View>
  );
}

function HeroCardEmpty() {
  return (
    <View className="gap-3 rounded-card bg-sage/30 px-5 py-5">
      <Text className="font-body-medium text-xs tracking-widest text-muted">
        BIGGEST WIN THIS WEEK
      </Text>
      <Text className="font-body text-base text-muted">
        Scan or upload a receipt to see this week's top impact swap
      </Text>
    </View>
  );
}

function SwapRow({ swap, isLast }: { swap: Swap; isLast: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        isLast ? "" : "border-b border-sage/25"
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="font-body-medium text-ink">
          {swap.fromName} → {swap.toName}
        </Text>
        <Text className="font-body text-sm text-muted">{swap.context}</Text>
      </View>
      <Text className="font-body-medium text-leaf">−{swap.savingKg} kg</Text>
    </View>
  );
}

function ChallengeCard({
  title,
  progress,
  target,
  daysLeft,
  onPress,
}: {
  title: string;
  progress: number;
  target: number;
  daysLeft: number;
  onPress: () => void;
}) {
  const pct = Math.min(100, (progress / target) * 100);
  return (
    <Pressable
      onPress={onPress}
      className="gap-2 rounded-card bg-sage/30 px-5 py-5"
    >
      <Text className="font-body-medium text-xs tracking-widest text-muted">
        WEEKLY CHALLENGE
      </Text>
      <Text className="font-display text-lg text-ink">{title}</Text>
      <Text className="font-body text-sm text-muted">
        {progress} of {target} done · {daysLeft} day{daysLeft === 1 ? "" : "s"}{" "}
        left · tap to log progress
      </Text>
      <View className="h-2 w-full overflow-hidden rounded-full bg-surface/60">
        <View
          className="h-full rounded-full bg-moss"
          style={{ width: `${pct}%` }}
        />
      </View>
    </Pressable>
  );
}

function HealthContent({
  health,
}: {
  health: ReturnType<typeof useHealthData>;
}) {
  return (
    <ScreenState
      loading={health.status === "loading"}
      error={health.status === "error" ? health.error : null}
      onRetry={health.refetch}
    >
      {health.data ? (
        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-10 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <HealthRecommendations
            dietFlags={health.data.dietFlags}
            allergyAlerts={health.data.allergyAlerts}
            recommendations={health.data.recommendations}
          />

          <View className="gap-0.5">
            <Text className="font-display text-lg text-ink">
              This week's macros
            </Text>
            <Text className="font-body text-sm text-muted">
              From this week's confirmed receipts
            </Text>
          </View>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <Tile
                label="Calories"
                value={`${health.data.macros.totalKcal}`}
              />
              <Tile
                label="Protein, g"
                value={`${health.data.macros.totalProteinG}`}
              />
            </View>
            <View className="flex-row gap-3">
              <Tile
                label="Carbs, g"
                value={`${health.data.macros.totalCarbsG}`}
              />
              <Tile label="Fat, g" value={`${health.data.macros.totalFatG}`} />
            </View>
          </View>

          <View className="gap-4 rounded-card bg-surface px-5 py-5">
            <View className="gap-0.5">
              <Text className="font-display text-lg text-ink">
                Where it comes from
              </Text>
              <Text className="font-body text-xs text-muted">
                Share of calories, by category
              </Text>
            </View>
            <MacroBars groups={health.data.macros.byGroup} />
          </View>
        </ScrollView>
      ) : null}
    </ScreenState>
  );
}
