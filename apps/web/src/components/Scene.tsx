import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

import type { WeekStatus } from "@/api/types";
import { FOREST_SVG, PLAINS_SVG, SMOG_SVG } from "@/components/sceneArt";

const CROSSFADE_MS = 500;

export function SceneBackground({ status }: { status: WeekStatus }) {
  const forestOpacity = useSharedValue(status === "below" ? 1 : 0);
  const plainsOpacity = useSharedValue(status === "within" ? 1 : 0);
  const smogOpacity = useSharedValue(status === "over" ? 1 : 0);

  useEffect(() => {
    const timing = { duration: CROSSFADE_MS, easing: Easing.out(Easing.ease) };
    forestOpacity.value = withTiming(status === "below" ? 1 : 0, timing);
    plainsOpacity.value = withTiming(status === "within" ? 1 : 0, timing);
    smogOpacity.value = withTiming(status === "over" ? 1 : 0, timing);
  }, [status, forestOpacity, plainsOpacity, smogOpacity]);

  const forestStyle = useAnimatedStyle(() => ({ opacity: forestOpacity.value }));
  const plainsStyle = useAnimatedStyle(() => ({ opacity: plainsOpacity.value }));
  const smogStyle = useAnimatedStyle(() => ({ opacity: smogOpacity.value }));

  return (
    <View className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <Animated.View style={[StyleSheet.absoluteFill, forestStyle]}>
        <SvgXml xml={FOREST_SVG} width="100%" height="100%" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, plainsStyle]}>
        <SvgXml xml={PLAINS_SVG} width="100%" height="100%" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, smogStyle]}>
        <SvgXml xml={SMOG_SVG} width="100%" height="100%" />
      </Animated.View>
    </View>
  );
}
