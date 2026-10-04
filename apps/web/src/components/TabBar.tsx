import type { ComponentProps, ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { Tabs } from "expo-router";
import { ArrowLeftRight, BarChart3, Leaf, Trophy, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "@/lib/colors";

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>["tabBar"]>;
type TabBarProps = Parameters<TabBarRenderer>[0];

const ICONS: Record<string, ComponentType<{ size: number; color: string }>> = {
  stats: BarChart3,
  swaps: ArrowLeftRight,
  index: Leaf,
  leagues: Trophy,
  profile: User,
};

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-start border-t border-sage/30 bg-surface pt-3"
      style={{ paddingBottom: Math.max(insets.bottom, 12), height: 68 + Math.max(insets.bottom, 12) }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const isHome = route.name === "index";
        const label = descriptors[route.key]?.options.title ?? route.name;
        const Icon = ICONS[route.name] ?? BarChart3;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            className="min-h-[44px] flex-1 items-center justify-start gap-1"
          >
            {isHome ? (
              <View
                className={`-mt-7 h-16 w-16 items-center justify-center rounded-full bg-moss ${
                  isFocused ? "border-[3px] border-surface" : ""
                }`}
              >
                <Icon size={24} color={colors.surface} />
              </View>
            ) : (
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  isFocused ? "bg-ink/10" : ""
                }`}
              >
                <Icon size={22} color={isFocused ? colors.moss : colors.muted} />
              </View>
            )}
            <Text className={isFocused ? "font-body-medium text-moss" : "font-body text-muted"}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
