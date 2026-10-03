import { ActivityIndicator, Pressable, Text, View } from "react-native";

import type { OffsetQuote } from "@/api/types";
import { colors } from "@/lib/colors";
import { Sheet } from "./Sheet";

type OffsetSheetProps = {
  visible: boolean;
  onClose: () => void;
  streak: number;
  limitKg: number;
  quote: OffsetQuote | null;
  quoteError: string | null;
  confirming: boolean;
  onConfirm: () => void;
  onRefreshQuote: () => void;
};

function cents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

export function OffsetSheet({
  visible,
  onClose,
  streak,
  limitKg,
  quote,
  quoteError,
  confirming,
  onConfirm,
  onRefreshQuote,
}: OffsetSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text className="font-display text-xl text-ink">Keep your {streak}-week streak</Text>

      {quote ? (
        <>
          <Text className="mt-2 font-body text-base text-muted">
            This week is {quote.kg} kg over your {limitKg} kg limit. Offset the difference and
            your streak carries on.
          </Text>

          <View className="mt-4 gap-3 rounded-card border border-sage/40 px-4 py-4">
            <View className="flex-row justify-between">
              <Text className="font-body text-ink">Carbon offset · {quote.kg} kg</Text>
              <Text className="font-body text-ink">{cents(quote.costCents)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="font-body text-ink">Service fee (5%)</Text>
              <Text className="font-body text-ink">{cents(quote.feeCents)}</Text>
            </View>
            <View className="flex-row justify-between border-t border-sage/40 pt-3">
              <Text className="font-body-medium text-ink">Total</Text>
              <Text className="font-body-medium text-ink">{cents(quote.totalCents)}</Text>
            </View>
            <Text className="font-body text-xs text-muted">
              Via {quote.provider} · {quote.project}
            </Text>
          </View>

          <Pressable
            onPress={onConfirm}
            disabled={confirming}
            className="mt-5 min-h-[44px] items-center justify-center rounded-btn bg-ember px-5 py-3"
            style={{ opacity: confirming ? 0.7 : 1 }}
          >
            {confirming ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text className="font-body-medium text-surface">
                Offset and keep streak · {cents(quote.totalCents)}
              </Text>
            )}
          </Pressable>
        </>
      ) : quoteError ? (
        <View className="mt-4 gap-3">
          <Text className="font-body text-base text-muted">
            We couldn't load an offset quote: {quoteError}
          </Text>
          <Pressable onPress={onRefreshQuote} className="min-h-[44px] items-center justify-center rounded-btn border border-moss px-5 py-3">
            <Text className="font-body-medium text-moss">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 items-center">
          <ActivityIndicator color={colors.moss} />
        </View>
      )}

      <Pressable onPress={onClose} className="mt-4 min-h-[44px] items-center justify-center py-2">
        <Text className="font-body-medium text-ink">Let the streak end</Text>
      </Pressable>
      <Text className="text-center font-body text-xs text-muted">
        Offsets don't cancel this week's emissions. Next week's swaps do more.
      </Text>
    </Sheet>
  );
}
