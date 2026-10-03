import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Sheet({ visible, onClose, children }: SheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-ink/40" onPress={onClose} />
      <SafeAreaView edges={["bottom"]} className="absolute bottom-0 w-full items-center">
        <View className="w-full max-w-[430px]">
          <View className="rounded-t-card bg-surface px-5 pb-6 pt-3">
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-sage/60" />
            {children}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
