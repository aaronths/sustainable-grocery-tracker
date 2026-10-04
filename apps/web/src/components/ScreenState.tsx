import { useCallback, useRef, useState, type ReactNode } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { Easing, FadeIn } from "react-native-reanimated";

import { colors } from "@/lib/colors";

const SCREEN_ENTERING = FadeIn.duration(450).easing(Easing.out(Easing.ease));

type ScreenStateProps = {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
};

export function ScreenState({
  loading,
  error,
  onRetry,
  isEmpty,
  emptyMessage,
  children,
}: ScreenStateProps) {
  const [revealKey, setRevealKey] = useState(0);
  const hasFocusedOnce = useRef(false);

  // Tab screens stay mounted after their first visit, so without this,
  // entrance animations would only ever play once. Bumping the key forces
  // the content below to remount (and replay `entering`) on every return
  // to this tab — but not on the very first mount, which already animates
  // in naturally and would otherwise double-play.
  useFocusEffect(
    useCallback(() => {
      if (hasFocusedOnce.current) {
        setRevealKey((key) => key + 1);
      } else {
        hasFocusedOnce.current = true;
      }
    }, []),
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-mist">
        <ActivityIndicator color={colors.moss} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-mist px-6">
        <Text className="text-center font-body text-base text-muted">{error}</Text>
        {onRetry ? (
          <Pressable
            onPress={onRetry}
            className="min-h-[44px] items-center justify-center rounded-btn bg-moss px-5 py-3"
          >
            <Text className="font-body-medium text-surface">Try again</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View className="flex-1 items-center justify-center bg-mist px-6">
        <Text className="text-center font-body text-base text-muted">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <Animated.View key={revealKey} entering={SCREEN_ENTERING} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}
