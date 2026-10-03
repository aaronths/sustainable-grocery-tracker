import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { colors } from "@/lib/colors";

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

  return <>{children}</>;
}
