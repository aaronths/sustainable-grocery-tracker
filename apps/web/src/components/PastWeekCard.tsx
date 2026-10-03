import { Text, View } from "react-native";

import type { WeekOutcome } from "@/api/types";
import { round1 } from "@/lib/scoring";

type PastWeekCardProps = {
  outcome: WeekOutcome;
  total: number;
  baseline: number;
  limit: number;
};

function headlineAndBody({ outcome, total, baseline, limit }: PastWeekCardProps): {
  headline: string;
  body: string;
} {
  if (outcome === "new_low") {
    const diff = round1(baseline - total);
    return {
      headline: "New personal low",
      body: `${diff} kg under the baseline at the time. This became the new baseline of ${total} kg.`,
    };
  }

  if (outcome === "kept") {
    const diff = round1(limit - total);
    return {
      headline: "Within baseline",
      body: `Finished ${diff} kg under the ${limit} kg limit that week.`,
    };
  }

  const excess = round1(total - limit);
  if (outcome === "offset") {
    return {
      headline: "Streak saved with an offset",
      body: `This week went ${excess} kg over the ${limit} kg limit, but an offset kept the streak alive.`,
    };
  }

  return {
    headline: "Streak broken",
    body: `This week went ${excess} kg over the ${limit} kg limit and the streak reset.`,
  };
}

export function PastWeekCard(props: PastWeekCardProps) {
  const { headline, body } = headlineAndBody(props);

  return (
    <View className="w-full gap-1.5 rounded-card bg-surface px-5 py-5">
      <Text className="font-display text-xl text-ink">{headline}</Text>
      <Text className="font-body text-base text-muted">{body}</Text>
    </View>
  );
}
