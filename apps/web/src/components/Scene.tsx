import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors } from "@/lib/colors";

function SceneFrame({ children }: { children: ReactNode }) {
  return (
    <View className="absolute inset-0" style={{ pointerEvents: "none" }}>
      <Svg width="100%" height="100%" viewBox="0 0 430 600" preserveAspectRatio="xMidYMax slice">
        <Rect x={0} y={0} width={430} height={600} fill={colors.mist} />
        {children}
      </Svg>
    </View>
  );
}

function Pine({ x, y, scale, color, opacity }: { x: number; y: number; scale: number; color: string; opacity: number }) {
  const w = 70 * scale;
  const h = 150 * scale;
  return (
    <Path
      d={`M ${x} ${y - h} L ${x - w / 2} ${y - h * 0.35} L ${x - w / 4} ${y - h * 0.35} L ${x - w / 2} ${y} L ${x + w / 2} ${y} L ${x + w / 4} ${y - h * 0.35} L ${x + w / 2} ${y - h * 0.35} Z`}
      fill={color}
      opacity={opacity}
    />
  );
}

export function Forest() {
  return (
    <SceneFrame>
      <Rect x={0} y={420} width={430} height={180} fill={colors.moss} opacity={0.12} />
      {/* back layer */}
      <Pine x={40} y={180} scale={0.6} color={colors.sage} opacity={0.5} />
      <Pine x={370} y={160} scale={0.65} color={colors.sage} opacity={0.5} />
      {/* mid layer */}
      <Pine x={20} y={340} scale={0.85} color={colors.leaf} opacity={0.85} />
      <Pine x={400} y={330} scale={0.9} color={colors.leaf} opacity={0.85} />
      {/* front layer, anchored at the bottom corners */}
      <Pine x={0} y={560} scale={1.3} color={colors.moss} opacity={1} />
      <Pine x={430} y={580} scale={1.4} color={colors.moss} opacity={1} />
    </SceneFrame>
  );
}

export function Plains() {
  return (
    <SceneFrame>
      <Circle cx={350} cy={90} r={70} fill={colors.sage} opacity={0.25} />
      <Circle cx={350} cy={90} r={46} fill={colors.sage} opacity={0.55} />
      <Path
        d="M 0 420 C 100 390, 330 390, 430 430 L 430 600 L 0 600 Z"
        fill={colors.sage}
        opacity={0.35}
      />
      <Path
        d="M 0 470 C 120 450, 320 450, 430 480 L 430 600 L 0 600 Z"
        fill={colors.sage}
        opacity={0.65}
      />
      <Path
        d="M 0 530 C 150 505, 300 505, 430 535 L 430 600 L 0 600 Z"
        fill={colors.leaf}
        opacity={0.9}
      />
    </SceneFrame>
  );
}

function Plume({ cx, cy, r, opacity }: { cx: number; cy: number; r: number; opacity: number }) {
  return <Circle cx={cx} cy={cy} r={r} fill={colors.smog} opacity={opacity} />;
}

export function Smog() {
  return (
    <SceneFrame>
      <Rect x={0} y={0} width={430} height={260} fill={colors.smog} opacity={0.18} />
      <Path d="M 0 60 Q 215 30 430 60 L 430 110 Q 215 90 0 110 Z" fill={colors.smog} opacity={0.25} />
      <Path d="M 0 140 Q 215 110 430 140 L 430 190 Q 215 170 0 190 Z" fill={colors.smog} opacity={0.32} />
      <Path d="M 0 220 Q 215 195 430 220 L 430 270 Q 215 250 0 270 Z" fill={colors.smog} opacity={0.45} />

      {/* smokestacks */}
      <Rect x={22} y={470} width={16} height={100} fill={colors.smog} opacity={0.9} />
      <Rect x={14} y={455} width={32} height={18} fill={colors.smog} opacity={0.9} />
      <Rect x={386} y={450} width={16} height={120} fill={colors.smog} opacity={0.9} />
      <Rect x={378} y={435} width={32} height={18} fill={colors.smog} opacity={0.9} />

      <Plume cx={30} cy={440} r={18} opacity={0.5} />
      <Plume cx={44} cy={410} r={26} opacity={0.38} />
      <Plume cx={34} cy={370} r={34} opacity={0.25} />
      <Plume cx={394} cy={420} r={20} opacity={0.5} />
      <Plume cx={410} cy={388} r={28} opacity={0.38} />
      <Plume cx={398} cy={345} r={36} opacity={0.22} />

      <Rect x={0} y={560} width={430} height={40} fill={colors.smog} opacity={0.15} />
    </SceneFrame>
  );
}
