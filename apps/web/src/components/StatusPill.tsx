import type { ReactNode } from "react";
import { Text, View } from "react-native";

import type { WeekStatus } from "@/api/types";

export type PillTone = "moss" | "sage" | "smog" | "translucent";

const TONE_CLASSES: Record<PillTone, { bg: string; text: string }> = {
  moss: { bg: "bg-moss", text: "text-surface" },
  sage: { bg: "bg-sage", text: "text-ink" },
  smog: { bg: "bg-smog", text: "text-surface" },
  translucent: { bg: "bg-surface/80", text: "text-ink" },
};

type PillProps = {
  tone: PillTone;
  icon?: ReactNode;
  children: ReactNode;
};

export function Pill({ tone, icon, children }: PillProps) {
  const { bg, text } = TONE_CLASSES[tone];
  return (
    <View className={`flex-row items-center gap-1.5 self-start rounded-full px-4 py-2 ${bg}`}>
      {icon}
      <Text className={`font-body-medium text-sm ${text}`}>{children}</Text>
    </View>
  );
}

export function statusPillTone(status: WeekStatus): PillTone {
  if (status === "below") return "moss";
  if (status === "within") return "sage";
  return "smog";
}

export function statusPillLabel(status: WeekStatus): string {
  if (status === "below") return "New personal low";
  if (status === "within") return "Within baseline";
  return "Over limit";
}

export function StatusPill({ status }: { status: WeekStatus }) {
  return <Pill tone={statusPillTone(status)}>{statusPillLabel(status)}</Pill>;
}
