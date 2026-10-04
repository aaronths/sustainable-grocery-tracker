import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Camera, Receipt as ReceiptIcon, TriangleAlert } from "lucide-react-native";

import type { OffsetQuote, WeekStatus } from "@/api/types";
import { colors } from "@/lib/colors";
import { round1 } from "@/lib/scoring";

type StatusCardProps = {
  status: WeekStatus;
  total: number;
  baseline: number;
  headroomKg: number;
  excessKg: number;
  daysLeft: number;
  streak: number;
  quote: OffsetQuote | null;
  quoteError: string | null;
  offsetPurchased: boolean;
  onScanPress: () => void;
  onOffsetPress: () => void;
  onViewReceiptsPress: () => void;
};

function headlineAndBody(props: StatusCardProps): {
  headline: string;
  body: string;
} {
  const { status, total, baseline, headroomKg, excessKg, daysLeft, streak } =
    props;

  if (status === "below") {
    const diff = round1(baseline - total);
    return {
      headline: "Your lowest week yet",
      body: `${diff} kg under your old baseline. Your new baseline is ${total} kg, so this is the number to beat now.`,
    };
  }

  if (status === "within") {
    return {
      headline: "Holding steady",
      body: `You are ${headroomKg} kg under your limit with ${daysLeft} day${
        daysLeft === 1 ? "" : "s"
      } to go. Stay there and your streak reaches ${streak + 1} weeks.`,
    };
  }

  const when =
    daysLeft === 0
      ? "today"
      : daysLeft === 1
      ? "tomorrow"
      : `in ${daysLeft} days`;
  return {
    headline: `${excessKg} kg over your limit`,
    body: `Your streak breaks when the week closes ${when}. Keep it alive through an offset!.`,
  };
}

export function StatusCard(props: StatusCardProps) {
  const {
    status,
    quote,
    quoteError,
    offsetPurchased,
    onScanPress,
    onOffsetPress,
    onViewReceiptsPress,
  } = props;
  const { headline, body } = headlineAndBody(props);

  return (
    <View className="w-full gap-4 rounded-card bg-surface px-5 py-5">
      <View className="gap-1.5">
        <Text className="font-display text-xl text-ink">{headline}</Text>
        <Text className="font-body text-base text-muted">{body}</Text>
      </View>

      {status === "over" && !offsetPurchased ? (
        <Pressable
          onPress={onOffsetPress}
          disabled={!quote}
          style={{
            shadowColor: colors.ember,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
            opacity: quote ? 1 : 0.6,
          }}
          className="min-h-[64px] flex-row items-center gap-3 rounded-btn bg-ember px-5 py-3"
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-surface/20">
            <TriangleAlert size={22} color={colors.surface} />
          </View>
          <View className="flex-1">
            <Text className="font-body-medium text-base text-surface">Over limit</Text>
            {quote ? (
              <Text className="font-body text-xs text-surface/85">
                Offset {quote.kg} kg for ${(quote.totalCents / 100).toFixed(2)} · keep streak
              </Text>
            ) : quoteError ? (
              <Text className="font-body text-xs text-surface/85">Unable to load offset quote</Text>
            ) : (
              <ActivityIndicator color={colors.surface} />
            )}
          </View>
        </Pressable>
      ) : null}

      {status === "over" && offsetPurchased ? (
        <View className="rounded-btn bg-sage/40 px-5 py-3">
          <Text className="font-body-medium text-ink">
            This week's emissions are fully offset — streak secured.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onScanPress}
        style={({ pressed }) => [
          status === "over"
            ? null
            : {
                shadowColor: colors.moss,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.25,
                shadowRadius: 12,
                elevation: 6,
              },
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
        className={
          status === "over"
            ? "min-h-[64px] flex-row items-center gap-3 rounded-btn border border-moss px-5 py-3"
            : "min-h-[64px] flex-row items-center gap-3 rounded-btn bg-moss px-5 py-3"
        }
      >
        <View
          className={
            status === "over"
              ? "h-11 w-11 items-center justify-center rounded-full bg-moss/10"
              : "h-11 w-11 items-center justify-center rounded-full bg-surface/15"
          }
        >
          <Camera
            size={22}
            color={status === "over" ? colors.moss : colors.surface}
          />
        </View>
        <View className="flex-1">
          <Text
            className={
              status === "over"
                ? "font-body-medium text-base text-moss"
                : "font-body-medium text-base text-surface"
            }
          >
            Scan a receipt
          </Text>
          <Text
            className={
              status === "over"
                ? "font-body text-xs text-moss/70"
                : "font-body text-xs text-surface/80"
            }
          >
            Takes about 10 seconds
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={onViewReceiptsPress}
        className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-btn px-5 py-3"
      >
        <ReceiptIcon size={16} color={colors.muted} />
        <Text className="font-body-medium text-muted">
          View previous receipts
        </Text>
      </Pressable>
    </View>
  );
}
