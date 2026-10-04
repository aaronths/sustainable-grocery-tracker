import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  Receipt as ReceiptIcon,
  TriangleAlert,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import ecoReceiptIcon from "@/assets/Eco_Receipt_Vine_Icon_Green.png";

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
          <PickView
            onTakePhoto={flow.takePhoto}
            onPickLibrary={flow.pickFromLibrary}
          />
        ) : null}

        {flow.phase === "uploading" || flow.phase === "processing" ? (
          <ProcessingView
            label={
              flow.phase === "uploading"
                ? "Uploading…"
                : "Reading your receipt…"
            }
          />
        ) : null}

        {flow.phase === "error" ? (
          <ErrorView message={flow.error} onRetry={flow.retry} />
        ) : null}

        {(flow.phase === "review" || flow.phase === "confirming") &&
        flow.receipt ? (
          <ReviewView
            receipt={flow.receipt}
            confirming={flow.phase === "confirming"}
            confirmError={flow.confirmError}
            categoryLabel={categoryLabel}
            onCorrect={(itemId) => setPickerItemId(itemId)}
            onUpdateMass={flow.updateItemMass}
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

function PickView({
  onTakePhoto,
  onPickLibrary,
}: {
  onTakePhoto: () => void;
  onPickLibrary: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <Animated.View entering={revealEntrance(0)}>
        <Image
          source={ecoReceiptIcon}
          contentFit="contain"
          style={{ width: 300, height: 500 }}
        />
      </Animated.View>
      <Animated.View entering={revealEntrance(1)}>
        <Text className="text-center font-body text-base text-muted">
          Take a photo of a receipt, or choose one from your library.
        </Text>
      </Animated.View>
      <Animated.View entering={revealEntrance(2)} className="w-full">
        <Pressable
          onPress={onTakePhoto}
          className="min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-btn bg-moss px-5 py-3"
        >
          <Camera size={18} color={colors.surface} />
          <Text className="font-body-medium text-surface">Take photo</Text>
        </Pressable>
      </Animated.View>
      <Animated.View entering={revealEntrance(3)} className="w-full">
        <Pressable
          onPress={onPickLibrary}
          className="min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-btn border border-moss px-5 py-3"
        >
          <ImageIcon size={18} color={colors.moss} />
          <Text className="font-body-medium text-moss">
            Choose from library
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function ProcessingView({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <PulsingReceiptIcon />
      <Text className="font-body text-base text-muted">{label}</Text>
    </View>
  );
}

function PulsingReceiptIcon() {
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style}>
      <ReceiptIcon size={48} color={colors.moss} />
    </Animated.View>
  );
}

function ErrorView({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-6">
      <AlertCircle size={28} color={colors.ember} />
      <Text className="text-center font-body text-base text-muted">
        {message ?? "Something went wrong."}
      </Text>
      <Pressable
        onPress={onRetry}
        className="min-h-[44px] items-center justify-center rounded-btn bg-moss px-5 py-3"
      >
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
  onUpdateMass,
  onConfirm,
}: {
  receipt: Receipt;
  confirming: boolean;
  confirmError: string | null;
  categoryLabel: (categoryId: string) => string;
  onCorrect: (itemId: string) => void;
  onUpdateMass: (itemId: string, massKg: number) => void;
  onConfirm: () => void;
}) {
  const total =
    Math.round(receipt.items.reduce((sum, item) => sum + item.kgCo2e, 0) * 10) /
    10;

  return (
    <View className="flex-1">
      <ScrollView
        contentContainerClassName="gap-3 px-5 pb-4"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={revealEntrance(0)}>
          <Text className="font-bold text-xl pb-5">Review Results</Text>
          <View className="flex-row justify-between">
            <Text className="font-body text-sm text-muted">
              {receipt.store}
            </Text>
            <Text className="font-body text-sm text-muted">
              Estimated Emissions
            </Text>
          </View>
        </Animated.View>
        {receipt.items.map((item, i) => (
          <Animated.View key={item.id} entering={revealEntrance(i + 1)}>
            <LineItemRow
              item={item}
              categoryLabel={categoryLabel}
              onCorrect={() => onCorrect(item.id)}
              onUpdateMass={(massKg) => onUpdateMass(item.id, massKg)}
            />
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
        {confirmError ? (
          <Text className="mb-2 text-center font-body text-sm text-ember">
            {confirmError}
          </Text>
        ) : null}
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
              <Text className="font-body-medium text-surface">
                Confirm and add to this week
              </Text>
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
  onUpdateMass,
}: {
  item: LineItem;
  categoryLabel: (categoryId: string) => string;
  onCorrect: () => void;
  onUpdateMass: (massKg: number) => void;
}) {
  const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;

  return (
    <View className="gap-2 rounded-tile bg-surface px-4 py-3">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 font-body-medium text-ink">{item.name}</Text>
        <Text className="font-body-medium text-ink">{item.kgCo2e} kg</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="font-body text-sm text-muted">
          {categoryLabel(item.categoryId)}
        </Text>
        {lowConfidence ? (
          <Pressable
            onPress={onCorrect}
            className="min-h-[32px] items-center justify-center rounded-full bg-ember/15 px-3 py-1.5"
          >
            <Text className="font-body-medium text-sm text-ember">
              Not right? Fix category
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row items-center justify-between">
        <WeightInput massKg={item.massKg} onSubmit={onUpdateMass} />
        {lowConfidence ? (
          <View className="flex-row items-center gap-1">
            <TriangleAlert size={12} color={colors.ember} />
            <Text className="font-body-medium text-xs text-ember">
              Review item weight
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function WeightInput({
  massKg,
  onSubmit,
}: {
  massKg: number;
  onSubmit: (massKg: number) => void;
}) {
  const [text, setText] = useState(String(massKg));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(String(massKg));
  }, [massKg]);

  const commit = () => {
    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed > 0 && parsed !== massKg) {
      onSubmit(parsed);
    } else {
      setText(String(massKg));
    }
  };

  return (
    <View className="flex-row items-center gap-1.5">
      <Text className="font-body text-sm text-muted">Weight</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit();
        }}
        onSubmitEditing={commit}
        keyboardType="decimal-pad"
        className="min-w-[48px] rounded-full bg-mist px-3 py-1 text-center font-body-medium text-sm text-ink"
      />
      <Text className="font-body text-sm text-muted">kg</Text>
    </View>
  );
}
