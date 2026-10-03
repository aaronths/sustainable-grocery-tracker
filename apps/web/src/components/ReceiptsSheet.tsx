import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react-native";

import type { Receipt } from "@/api/types";
import { colors } from "@/lib/colors";
import { Sheet } from "./Sheet";

type ReceiptsSheetProps = {
  visible: boolean;
  onClose: () => void;
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  deletingId: string | null;
  onRetry: () => void;
  onDelete: (id: string) => void;
};

function receiptTotal(receipt: Receipt): number {
  return Math.round(receipt.items.reduce((sum, item) => sum + item.kgCo2e, 0) * 10) / 10;
}

const STATUS_LABEL: Record<Receipt["status"], string> = {
  processing: "Processing",
  ready: "Needs review",
  confirmed: "Confirmed",
};

export function ReceiptsSheet({
  visible,
  onClose,
  receipts,
  loading,
  error,
  deletingId,
  onRetry,
  onDelete,
}: ReceiptsSheetProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setConfirmingId(null);
        onClose();
      }}
    >
      <Text className="font-display text-xl text-ink">Previous receipts</Text>

      <ScrollView className="mt-4 max-h-[60vh]" showsVerticalScrollIndicator={false}>
        {loading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={colors.moss} />
          </View>
        ) : error ? (
          <View className="items-center gap-3 py-8">
            <Text className="text-center font-body text-muted">{error}</Text>
            <Pressable
              onPress={onRetry}
              className="min-h-[44px] items-center justify-center rounded-btn bg-moss px-5 py-3"
            >
              <Text className="font-body-medium text-surface">Try again</Text>
            </Pressable>
          </View>
        ) : receipts.length === 0 ? (
          <View className="items-center py-8">
            <Text className="font-body text-muted">No receipts scanned yet.</Text>
          </View>
        ) : (
          receipts.map((receipt, index) => {
            const expanded = expandedId === receipt.id;
            const confirming = confirmingId === receipt.id;
            const isLast = index === receipts.length - 1;
            const isDeleting = deletingId === receipt.id;

            return (
              <View key={receipt.id} className={isLast ? "" : "border-b border-sage/20"}>
                <View className="flex-row items-center gap-3 py-3">
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : receipt.id)}
                    className="flex-1 flex-row items-center gap-3"
                  >
                    <View className="flex-1">
                      <Text className="font-body-medium text-ink">{receipt.store}</Text>
                      <Text className="font-body text-sm text-muted">
                        {new Date(receipt.uploadedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {STATUS_LABEL[receipt.status]}
                      </Text>
                    </View>
                    <Text className="font-body-medium text-ink">{receiptTotal(receipt)} kg</Text>
                    {expanded ? (
                      <ChevronUp size={18} color={colors.muted} />
                    ) : (
                      <ChevronDown size={18} color={colors.muted} />
                    )}
                  </Pressable>

                  {confirming ? (
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() => setConfirmingId(null)}
                        className="min-h-[36px] items-center justify-center px-1"
                      >
                        <Text className="font-body-medium text-muted">Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setConfirmingId(null);
                          onDelete(receipt.id);
                        }}
                        className="min-h-[36px] items-center justify-center rounded-full bg-ember px-3 py-1.5"
                      >
                        <Text className="font-body-medium text-surface">Delete</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setConfirmingId(receipt.id)}
                      disabled={isDeleting}
                      className="min-h-[36px] min-w-[36px] items-center justify-center"
                      style={{ opacity: isDeleting ? 0.4 : 1 }}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={colors.ember} />
                      ) : (
                        <Trash2 size={18} color={colors.ember} />
                      )}
                    </Pressable>
                  )}
                </View>

                {expanded ? (
                  <View className="gap-1.5 pb-3 pl-0.5">
                    {receipt.items.length === 0 ? (
                      <Text className="font-body text-sm text-muted">Still parsing items…</Text>
                    ) : (
                      receipt.items.map((item) => (
                        <View key={item.id} className="flex-row justify-between">
                          <Text className="font-body text-sm text-muted">{item.name}</Text>
                          <Text className="font-body text-sm text-muted">{item.kgCo2e} kg</Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </Sheet>
  );
}
