import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";

import type { Challenge } from "@/api/types";
import { colors } from "@/lib/colors";
import { Sheet } from "./Sheet";

type ChallengeProgressSheetProps = {
  visible: boolean;
  onClose: () => void;
  challenge: Challenge | null;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
};

export function ChallengeProgressSheet({
  visible,
  onClose,
  challenge,
  submitting,
  submitError,
  onSubmit,
}: ChallengeProgressSheetProps) {
  if (!challenge) return null;

  const complete = challenge.progress >= challenge.target;
  const pct = Math.min(100, (challenge.progress / challenge.target) * 100);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text className="font-body-medium text-xs tracking-widest text-muted">WEEKLY CHALLENGE</Text>
      <Text className="mt-1 font-display text-xl text-ink">{challenge.title}</Text>

      <Text className="mt-2 font-body text-base text-muted">
        {challenge.progress} of {challenge.target} done this week.
      </Text>
      <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sage/25">
        <View className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
      </View>

      {submitError ? (
        <Text className="mt-3 text-center font-body text-sm text-ember">{submitError}</Text>
      ) : null}

      {complete ? (
        <View className="mt-5 flex-row items-center justify-center gap-2 rounded-btn bg-sage/40 px-5 py-3">
          <Check size={18} color={colors.ink} />
          <Text className="font-body-medium text-ink">Challenge complete!</Text>
        </View>
      ) : (
        <Pressable
          onPress={onSubmit}
          disabled={submitting}
          className="mt-5 min-h-[44px] items-center justify-center rounded-btn bg-moss px-5 py-3"
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text className="font-body-medium text-surface">Log today's progress</Text>
          )}
        </Pressable>
      )}

      <Pressable onPress={onClose} className="mt-4 min-h-[44px] items-center justify-center py-2">
        <Text className="font-body-medium text-ink">Close</Text>
      </Pressable>
    </Sheet>
  );
}
