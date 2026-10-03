import { Text } from "react-native";

type BigNumberProps = {
  value: number;
  decimals?: number;
};

export function BigNumber({ value, decimals = 1 }: BigNumberProps) {
  return (
    <Text className="font-display text-ink" style={{ fontSize: 88, lineHeight: 92 }}>
      {value.toFixed(decimals)}
    </Text>
  );
}
