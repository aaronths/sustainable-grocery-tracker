import { Pressable, ScrollView, Text, View } from "react-native";
import { ArrowLeftRight, Camera, Flame, HeartPulse, Leaf } from "lucide-react-native";

import { colors } from "@/lib/colors";
import { Sheet } from "./Sheet";

type StepProps = {
  icon: typeof Camera;
  title: string;
  body: string;
};

const STEPS: StepProps[] = [
  {
    icon: Camera,
    title: "Scan your receipts",
    body: "Snap a photo or forward an email receipt. Each item gets an estimated carbon footprint and macros (calories, protein, carbs, fat).",
  },
  {
    icon: Flame,
    title: "Beat your baseline",
    body: "Your baseline is your lowest confirmed week. Stay within baseline + 10% to keep your streak alive.",
  },
  {
    icon: ArrowLeftRight,
    title: "Get swap ideas",
    body: "Every week GreenGro finds the single swap — same category, lower footprint — that would save you the most.",
  },
  {
    icon: Leaf,
    title: "Offset an over-limit week",
    body: "Going over happens. Buy a carbon offset (small service fee) to neutralize the week and keep your streak instead of breaking it.",
  },
  {
    icon: HeartPulse,
    title: "Link your health records",
    body: "Connect your Finchnode health records from Insights to get grocery swaps tailored to conditions like high cholesterol or diabetes.",
  },
];

function Step({ icon: Icon, title, body }: StepProps) {
  return (
    <View className="flex-row gap-3 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-sage/30">
        <Icon size={18} color={colors.moss} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-body-medium text-ink">{title}</Text>
        <Text className="font-body text-sm text-muted">{body}</Text>
      </View>
    </View>
  );
}

export function HowItWorksSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text className="font-display text-xl text-ink">How does GreenGro work?</Text>

      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false} className="mt-1">
        {STEPS.map((step, i) => (
          <View key={step.title} className={i === STEPS.length - 1 ? "" : "border-b border-sage/20"}>
            <Step {...step} />
          </View>
        ))}
      </ScrollView>

      <Pressable onPress={onClose} className="mt-4 min-h-[44px] items-center justify-center rounded-btn bg-moss py-3">
        <Text className="font-body-medium text-surface">Got it</Text>
      </Pressable>
    </Sheet>
  );
}
