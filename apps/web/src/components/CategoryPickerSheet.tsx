import { Pressable, ScrollView, Text, View } from "react-native";

import type { Category } from "@/api/types";
import { Sheet } from "./Sheet";

type CategoryPickerSheetProps = {
  visible: boolean;
  categories: Category[];
  onClose: () => void;
  onSelect: (categoryId: string) => void;
};

export function CategoryPickerSheet({ visible, categories, onClose, onSelect }: CategoryPickerSheetProps) {
  const groups = Array.from(new Set(categories.map((c) => c.group)));

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text className="font-display text-xl text-ink">Choose a category</Text>
      <ScrollView className="mt-4 max-h-[60vh]" showsVerticalScrollIndicator={false}>
        {groups.map((group) => (
          <View key={group} className="mb-4">
            <Text className="mb-2 font-body-medium text-xs uppercase tracking-widest text-muted">
              {group}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {categories
                .filter((c) => c.group === group)
                .map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      onSelect(c.id);
                      onClose();
                    }}
                    className="min-h-[36px] items-center justify-center rounded-full bg-sage/30 px-4 py-2"
                  >
                    <Text className="font-body-medium text-ink">{c.name}</Text>
                  </Pressable>
                ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}
