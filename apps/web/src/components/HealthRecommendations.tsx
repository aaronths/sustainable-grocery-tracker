import { Text, View } from "react-native";
import { TriangleAlert } from "lucide-react-native";

import type { DietFlag, HealthRecommendation } from "@/api/types";
import { colors } from "@/lib/colors";

const FLAG_LABEL: Record<DietFlag, string> = {
  "low-fat": "Low-fat",
  "low-carb": "Low-carb",
  "high-protein": "High-protein",
  "low-calorie": "Low-calorie",
};

const IMPACT_LABEL: Record<DietFlag, (amount: number) => string> = {
  "low-fat": (amount) => `${amount}g less fat`,
  "low-carb": (amount) => `${amount}g less carbs`,
  "low-calorie": (amount) => `${amount} fewer calories`,
  "high-protein": (amount) => `${amount}g more protein`,
};

type HealthRecommendationsProps = {
  dietFlags: DietFlag[];
  allergyAlerts: string[];
  recommendations: HealthRecommendation[];
};

export function HealthRecommendations({
  dietFlags,
  allergyAlerts,
  recommendations,
}: HealthRecommendationsProps) {
  if (
    dietFlags.length === 0 &&
    allergyAlerts.length === 0 &&
    recommendations.length === 0
  ) {
    return null;
  }

  const [hero, ...rest] = recommendations;

  return (
    <View className="gap-4 rounded-card bg-leaf px-5 py-5">
      <View className="gap-0.5">
        <Text className="font-display text-lg text-surface">
          Based on your health records
        </Text>
        <Text className="font-body text-xs text-surface/70">
          Synced from your patient records
        </Text>
      </View>

      {dietFlags.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {dietFlags.map((flag) => (
            <View key={flag} className="rounded-full bg-sage px-3 py-1.5">
              <Text className="font-body-medium text-xs text-ink">
                Suggested diet: {FLAG_LABEL[flag]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {allergyAlerts.length > 0 ? (
        <View className="flex-row items-center gap-1.5 self-start rounded-full bg-surface px-3 py-1.5">
          <TriangleAlert size={12} color={colors.ember} />
          <Text className="font-body-medium text-xs text-ember">
            Watch for {allergyAlerts.join(", ")} in this week&apos;s items
          </Text>
        </View>
      ) : null}

      {hero ? (
        <View className="gap-1">
          <View>
            <Text className="font-display text-2xl text-surface">
              {hero.fromName} →
            </Text>
            <Text className="font-display text-2xl text-surface">
              {hero.toName}
            </Text>
          </View>
          <Text className="font-body text-base text-surface/90">
            {hero.context}. About{" "}
            {IMPACT_LABEL[hero.dietFlag](hero.impactAmount)} per week.
          </Text>
        </View>
      ) : (
        <Text className="font-body text-base text-surface/90">
          Scan a receipt to see a swap tailored to your health records.
        </Text>
      )}

      {rest.length > 0 ? (
        <View className="gap-0.5">
          {rest.map((rec, i) => (
            <RecommendationRow
              key={`${rec.dietFlag}-${rec.fromName}`}
              recommendation={rec}
              isLast={i === rest.length - 1}
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
    <View
      className={`flex-row items-center justify-between py-3 ${
        isLast ? "" : "border-b border-surface/20"
      }`}
    >
      <View className="flex-1 pr-3">
        <Text className="font-body-medium text-surface">
          {recommendation.fromName} → {recommendation.toName}
        </Text>
        <Text className="font-body text-sm text-surface/70">
          {FLAG_LABEL[recommendation.dietFlag]} · {recommendation.context}
        </Text>
      </View>
      <Text className="font-body-medium text-surface">
        {IMPACT_LABEL[recommendation.dietFlag](recommendation.impactAmount)}
      </Text>
    </View>
  );
}
