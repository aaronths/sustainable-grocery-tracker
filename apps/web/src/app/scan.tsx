import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { AlertCircle, ArrowLeft, Camera, Check, Image as ImageIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { Easing, FadeIn } from "react-native-reanimated";

import { getCategories } from "@/api/resources";
import type { Category, LineItem, Receipt } from "@/api/types";
import { CategoryPickerSheet } from "@/components/CategoryPickerSheet";
import { useScanFlow } from "@/features/scan/useScanFlow";
import { colors } from "@/lib/colors";
import { revealEntrance } from "@/lib/motion";

const LOW_CONFIDENCE_THRESHOLD = 0.7;
const SCREEN_ENTERING = FadeIn.duration(450).easing(Easing.out(Easing.ease));

export default function ScanScreen() {
  const router = useRouter();
  const flow = useScanFlow(() => router.back());
  const [categories, setCategories] = useState<Category[]>([]);
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const categoryLabel = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? `${category.group} · ${category.name}` : categoryId;
  };

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
          <Text className="font-display text-lg text-ink">Scan receipt</Text>
          <View className="min-h-[44px] min-w-[44px]" />
        </View>

        {flow.phase === "pick" ? (
          <PickView onTakePhoto={flow.takePhoto} onPickLibrary={flow.pickFromLibrary} />
        ) : null}

        {flow.phase === "uploading" || flow.phase === "processing" ? (
          <ProcessingView label={flow.phase === "uploading" ? "Uploading…" : "Reading your receipt…"} />
        ) : null}

        {flow.phase === "error" ? <ErrorView message={flow.error} onRetry={flow.retry} /> : null}

        {(flow.phase === "review" || flow.phase === "confirming") && flow.receipt ? (
          <ReviewView
            receipt={flow.receipt}
            confirming={flow.phase === "confirming"}
            confirmError={flow.confirmError}
            categoryLabel={categoryLabel}
            onCorrect={(itemId) => setPickerItemId(itemId)}
            onConfirm={flow.confirm}
          />
        ) : null}
      </SafeAreaView>

      <CategoryPickerSheet
        visible={pickerItemId !== null}
        categories={categories}
        onClose={() => setPickerItemId(null)}
        onSelect={(categoryId) => {
          if (pickerItemId) flow.correctItem(pickerItemId, categoryId);
        }}
      />
    </Animated.View>
  );
}

function PickView({ onTakePhoto, onPickLibrary }: { onTakePhoto: () => void; onPickLibrary: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Animated.View entering={revealEntrance(0)}>
        <Text className="text-center font-body text-base text-muted">
          Take a photo of a receipt, or choose one from your library.
        </Text>
      </Animated.View>
      <Animated.View entering={revealEntrance(1)} className="w-full">
        <Pressable
          onPress={onTakePhoto}
          className="min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-btn bg-moss px-5 py-3"
        >
          <Camera size={18} color={colors.surface} />
          <Text className="font-body-medium text-surface">Take photo</Text>
        </Pressable>
      </Animated.View>
      <Animated.View entering={revealEntrance(2)} className="w-full">
        <Pressable
          onPress={onPickLibrary}
          className="min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-btn border border-moss px-5 py-3"
        >
          <ImageIcon size={18} color={colors.moss} />
          <Text className="font-body-medium text-moss">Choose from library</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ProcessingView({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <ActivityIndicator color={colors.moss} />
      <Text className="font-body text-base text-muted">{label}</Text>
    </View>
  );
}

function ErrorView({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <AlertCircle size={28} color={colors.ember} />
      <Text className="text-center font-body text-base text-muted">{message ?? "Something went wrong."}</Text>
      <Pressable onPress={onRetry} className="min-h-[44px] items-center justify-center rounded-btn bg-moss px-5 py-3">
        <Text className="font-body-medium text-surface">Try again</Text>
      </Pressable>
    </View>
  );
}

function ReviewView({
  receipt,
  confirming,
  confirmError,
  categoryLabel,
  onCorrect,
  onConfirm,
}: {
  receipt: Receipt;
  confirming: boolean;
  confirmError: string | null;
  categoryLabel: (categoryId: string) => string;
  onCorrect: (itemId: string) => void;
  onConfirm: () => void;
}) {
  const total = Math.round(receipt.items.reduce((sum, item) => sum + item.kgCo2e, 0) * 10) / 10;

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-3 px-5 pb-4" showsVerticalScrollIndicator={false}>
        <Animated.View entering={revealEntrance(0)}>
          <Text className="font-body text-sm text-muted">{receipt.store}</Text>
        </Animated.View>
        {receipt.items.map((item, i) => (
          <Animated.View key={item.id} entering={revealEntrance(i + 1)}>
            <LineItemRow item={item} categoryLabel={categoryLabel} onCorrect={() => onCorrect(item.id)} />
          </Animated.View>
        ))}
        <Animated.View
          entering={revealEntrance(receipt.items.length + 1)}
          className="mt-2 flex-row justify-between rounded-tile bg-surface px-4 py-3"
        >
          <Text className="font-body-medium text-ink">Total</Text>
          <Text className="font-body-medium text-ink">{total} kg CO₂e</Text>
        </Animated.View>
      </ScrollView>

      <View className="px-5 pb-2 pt-3">
        {confirmError ? <Text className="mb-2 text-center font-body text-sm text-ember">{confirmError}</Text> : null}
        <Pressable
          onPress={onConfirm}
          disabled={confirming}
          className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-btn bg-moss px-5 py-3"
          style={{ opacity: confirming ? 0.7 : 1 }}
        >
          {confirming ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <>
              <Check size={18} color={colors.surface} />
              <Text className="font-body-medium text-surface">Confirm and add to this week</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function LineItemRow({
  item,
  categoryLabel,
  onCorrect,
}: {
  item: LineItem;
  categoryLabel: (categoryId: string) => string;
  onCorrect: () => void;
}) {
  const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <View className="gap-2 rounded-tile bg-surface px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-body-medium text-ink">{item.name}</Text>
        <Text className="font-body-medium text-ink">{item.kgCo2e} kg</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="font-body text-sm text-muted">{categoryLabel(item.categoryId)}</Text>
        {lowConfidence ? (
          <Pressable
            onPress={onCorrect}
            className="min-h-[32px] items-center justify-center rounded-full bg-ember/15 px-3 py-1.5"
          >
            <Text className="font-body-medium text-sm text-ember">Not right? Fix category</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
