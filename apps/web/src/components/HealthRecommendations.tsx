import { Text, View } from "react-native";

import type { DietFlag, HealthRecommendation } from "@/api/types";

const FLAG_LABEL: Record<DietFlag, string> = {
  "low-fat": "Low-fat",
  "low-carb": "Low-carb",
  "high-protein": "High-protein",
  "low-calorie": "Low-calorie",
};

type HealthRecommendationsProps = {
  dietFlags: DietFlag[];
  allergyAlerts: string[];
  recommendations: HealthRecommendation[];
};

export function HealthRecommendations({ dietFlags, allergyAlerts, recommendations }: HealthRecommendationsProps) {
  if (dietFlags.length === 0 && allergyAlerts.length === 0 && recommendations.length === 0) {
    return null;
  }

  return (
    <View className="gap-4 rounded-card bg-surface px-5 py-5">
      <View className="gap-0.5">
        <Text className="font-display text-lg text-ink">Based on your health records</Text>
        <Text className="font-body text-xs text-muted">Synced from your patient records</Text>
      </View>

      {dietFlags.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {dietFlags.map((flag) => (
            <View key={flag} className="rounded-full bg-sage/30 px-3 py-1.5">
              <Text className="font-body-medium text-xs text-ink">{FLAG_LABEL[flag]}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {allergyAlerts.length > 0 ? (
        <Text className="font-body text-sm text-ember">
          Allergy alert: watch for {allergyAlerts.join(", ")} in this week&apos;s items
        </Text>
      ) : null}

      {recommendations.length > 0 ? (
        <View className="gap-0.5">
          {recommendations.map((rec, i) => (
            <RecommendationRow
              key={`${rec.dietFlag}-${rec.fromName}`}
              recommendation={rec}
              isLast={i === recommendations.length - 1}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RecommendationRow({
  recommendation,
  isLast,
}: {
  recommendation: HealthRecommendation;
  isLast: boolean;
}) {
  return (
    <View className={`gap-0.5 py-3 ${isLast ? "" : "border-b border-sage/25"}`}>
      <Text className="font-body-medium text-ink">
        {recommendation.fromName} → {recommendation.toName}
      </Text>
      <Text className="font-body text-sm text-muted">
        {FLAG_LABEL[recommendation.dietFlag]} · {recommendation.context}
      </Text>
    </View>
  );
}
