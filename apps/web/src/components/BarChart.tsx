import { Text, View } from "react-native";

export type BarChartItem = {
  id: string;
  totalKg: number;
  color: string;
  label?: string;
};

type BarChartProps = {
  items: BarChartItem[];
  maxKg?: number;
  height?: number;
};

export function BarChart({ items, maxKg, height = 160 }: BarChartProps) {
  const max = maxKg ?? Math.max(...items.map((item) => item.totalKg), 1);

  return (
    <View className="flex-row items-end gap-1.5">
      {items.map((item) => {
        const barHeight = Math.max(4, (item.totalKg / max) * height);
        return (
          <View key={item.id} className="flex-1 items-center justify-end gap-1">
            <View
              className="w-full items-center justify-end"
              style={{ height }}
            >
              <View
                className="w-full max-w-[28px] rounded-full"
                style={{ height: barHeight, backgroundColor: item.color }}
              />
            </View>
            {item.label ? (
              <Text className="font-body text-[11px] text-muted">{item.label}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
