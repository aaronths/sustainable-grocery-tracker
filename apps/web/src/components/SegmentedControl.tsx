import { Pressable, Text, View } from "react-native";

type Option<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-1 rounded-full bg-sage/25 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`min-h-[36px] flex-1 items-center justify-center rounded-full px-3 py-1.5 ${
              selected ? "bg-surface" : ""
            }`}
          >
            <Text className={selected ? "font-body-medium text-ink" : "font-body text-muted"}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
