import { Text, View } from "react-native";

import type { MacroGroupStat } from "@/api/types";

type MacroBarsProps = {
  groups: MacroGroupStat[];
};

export function MacroBars({ groups }: MacroBarsProps) {
  const totalKcal = Math.max(1, groups.reduce((sum, g) => sum + g.kcal, 0));
  const sorted = groups.slice().sort((a, b) => b.kcal - a.kcal);

  return (
    <View className="gap-4">
      {sorted.map((group) => {
        const pct = Math.round((group.kcal / totalKcal) * 100);
        return (
          <View key={group.group} className="gap-1.5">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-body-medium text-ink">{group.group}</Text>
              <Text className="font-body-medium text-ink">
                {group.kcal} kcal · {pct}%
              </Text>
            </View>
            <View className="h-2 w-full overflow-hidden rounded-full bg-sage/25">
              <View className="h-full rounded-full bg-leaf" style={{ width: `${pct}%` }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
