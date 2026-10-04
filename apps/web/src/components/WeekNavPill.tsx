import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/lib/colors";

type WeekNavPillProps = {
  label: string;
  sublabel: string;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

function NavButton({
  visible,
  onPress,
  children,
}: {
  visible: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  if (!visible) {
    return <View className="h-9 w-9" />;
  }
  return (
    <Pressable
      onPress={onPress}
      className="h-9 w-9 items-center justify-center rounded-full bg-surface/80"
    >
      {children}
    </Pressable>
  );
}

export function WeekNavPill({ label, sublabel, hasPrev, hasNext, onPrev, onNext }: WeekNavPillProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      <NavButton visible={hasPrev} onPress={onPrev}>
        <ChevronLeft size={16} color={colors.ink} />
      </NavButton>

      <View className="gap-0.5 rounded-card bg-surface px-4 py-2.5">
        <Text className="font-display-medium text-base text-ink">{label}</Text>
        <Text className="font-body text-xs text-muted">{sublabel}</Text>
      </View>

      <NavButton visible={hasNext} onPress={onNext}>
        <ChevronRight size={16} color={colors.ink} />
      </NavButton>
    </View>
  );
}
