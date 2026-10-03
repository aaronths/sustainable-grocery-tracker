import { Text, View } from "react-native";

type TileProps = {
  label: string;
  value: string;
  valueColor?: "ink" | "leaf" | "ember";
};

const VALUE_COLOR_CLASS: Record<NonNullable<TileProps["valueColor"]>, string> = {
  ink: "text-ink",
  leaf: "text-leaf",
  ember: "text-ember",
};

export function Tile({ label, value, valueColor = "ink" }: TileProps) {
  return (
    <View className="flex-1 gap-1 rounded-tile bg-surface px-4 py-4">
      <Text className={`font-display text-2xl ${VALUE_COLOR_CLASS[valueColor]}`}>{value}</Text>
      <Text className="font-body text-xs text-muted">{label}</Text>
    </View>
  );
}
