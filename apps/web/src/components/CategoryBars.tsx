import { Text, View } from "react-native";

import type { CategoryGroup } from "@/api/types";

export type CategoryBarItem = {
  group: CategoryGroup;
  avgKgCo2e: number;
  pct: number;
};

type CategoryBarsProps = {
  categories: CategoryBarItem[];
};

export function CategoryBars({ categories }: CategoryBarsProps) {
  return (
    <View className="gap-4">
      {categories.map((category) => (
        <View key={category.group} className="gap-1.5">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-body-medium text-ink">{category.group}</Text>
            <Text className="font-body-medium text-ink">
              {category.avgKgCo2e.toFixed(1)} kg · {category.pct}%
            </Text>
          </View>
          <View className="h-2 w-full overflow-hidden rounded-full bg-sage/25">
            <View className="h-full rounded-full bg-leaf" style={{ width: `${category.pct}%` }} />
          </View>
        </View>
      ))}
    </View>
  );
}
