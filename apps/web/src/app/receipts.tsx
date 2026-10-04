import { useState } from "react";
import { useRouter } from "expo-router";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";

import type { Receipt } from "@/api/types";
import { useReceiptsData } from "@/features/receipts/useReceiptsData";
import { colors } from "@/lib/colors";

const SCREEN_ENTERING = FadeIn.duration(450).easing(Easing.out(Easing.ease));

const STATUS_LABEL: Record<Receipt["status"], string> = {
  processing: "Processing",
  ready: "Needs review",
  confirmed: "Confirmed",
};

function receiptTotal(receipt: Receipt): number {
  return Math.round(receipt.items.reduce((sum, item) => sum + item.kgCo2e, 0) * 10) / 10;
}

export default function ReceiptsScreen() {
  const router = useRouter();
  const receipts = useReceiptsData(true);

  return (
    <Animated.View entering={SCREEN_ENTERING} className="flex-1 bg-mist">
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <View className="flex-row items-center justify-between px-5 py-3">
          <Pressable
            onPress={() => router.back()}
            className="min-h-[44px] min-w-[44px] items-center justify-center"
          >
            <ArrowLeft size={22} color={colors.ink} />
          </Pressable>
          <Text className="font-display text-lg text-ink">Previous receipts</Text>
          <View className="min-h-[44px] min-w-[44px]" />
        </View>

        {receipts.status === "loading" ? (
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <ActivityIndicator color={colors.moss} />
          </View>
        ) : null}

        {receipts.status === "error" ? (
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <AlertCircle size={28} color={colors.ember} />
            <Text className="text-center font-body text-base text-muted">{receipts.error}</Text>
            <Pressable
              onPress={receipts.refetch}
              className="min-h-[44px] items-center justify-center rounded-btn bg-moss px-5 py-3"
            >
              <Text className="font-body-medium text-surface">Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {receipts.status === "ready" && receipts.receipts.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-6">
            <Text className="text-center font-body text-base text-muted">No receipts scanned yet.</Text>
          </View>
        ) : null}

        {receipts.status === "ready" && receipts.receipts.length > 0 ? (
          <ScrollView contentContainerClassName="gap-3 px-5 pb-4" showsVerticalScrollIndicator={false}>
            {receipts.receipts.map((receipt) => (
              <ReceiptRow
                key={receipt.id}
                receipt={receipt}
                deleting={receipts.deletingId === receipt.id}
                onDelete={() => receipts.remove(receipt.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Animated.View>
  );
}

function ReceiptRow({
  receipt,
  deleting,
  onDelete,
}: {
  receipt: Receipt;
  deleting: boolean;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <View className="gap-2 rounded-tile bg-surface px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={() => setExpanded((e) => !e)} className="flex-1 flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="font-body-medium text-ink">{receipt.store}</Text>
            <Text className="font-body text-sm text-muted">
              {new Date(receipt.uploadedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              · {STATUS_LABEL[receipt.status]}
            </Text>
          </View>
          <Text className="font-body-medium text-ink">{receiptTotal(receipt)} kg</Text>
          {expanded ? (
            <ChevronUp size={18} color={colors.muted} />
          ) : (
            <ChevronDown size={18} color={colors.muted} />
          )}
        </Pressable>

        {confirming ? (
          <View className="flex-row items-center gap-3">
            <Pressable onPress={() => setConfirming(false)} className="min-h-[36px] items-center justify-center px-1">
              <Text className="font-body-medium text-muted">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setConfirming(false);
                onDelete();
              }}
              className="min-h-[36px] items-center justify-center rounded-full bg-ember px-3 py-1.5"
            >
              <Text className="font-body-medium text-surface">Delete</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirming(true)}
            disabled={deleting}
            className="min-h-[36px] min-w-[36px] items-center justify-center"
            style={{ opacity: deleting ? 0.4 : 1 }}
          >
            {deleting ? <ActivityIndicator size="small" color={colors.ember} /> : <Trash2 size={18} color={colors.ember} />}
          </Pressable>
        )}
      </View>

      {expanded ? (
        <View className="gap-1.5 border-t border-sage/20 pt-2">
          {receipt.items.length === 0 ? (
            <Text className="font-body text-sm text-muted">Still parsing items…</Text>
          ) : (
            receipt.items.map((item) => (
              <View key={item.id} className="flex-row justify-between">
                <Text className="font-body text-sm text-muted">{item.name}</Text>
                <Text className="font-body text-sm text-muted">{item.kgCo2e} kg</Text>
              </View>
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}
