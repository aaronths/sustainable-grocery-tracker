import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { ApiError } from "@/api/client";
import { confirmReceipt, getReceipt, patchReceiptItem, uploadReceipt } from "@/api/resources";
import type { Receipt } from "@/api/types";

export type ScanPhase = "pick" | "uploading" | "processing" | "review" | "confirming" | "error";

const POLL_INTERVAL_MS = 1000;

// Surfaces the real failure reason (network error, timeout, etc.) instead of
// a generic message, so issues like a bad EXPO_PUBLIC_API_URL or a dropped
// connection on a flaky network are actually visible instead of swallowed.
function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return `${fallback}: ${err.message}`;
  return fallback;
}

async function buildFormData(asset: ImagePicker.ImagePickerAsset): Promise<FormData> {
  const formData = new FormData();
  if (Platform.OS === "web" && asset.file) {
    formData.append("image", asset.file);
    return formData;
  }
  // The old RN FormData shorthand — appending a plain {uri, name, type}
  // object — throws "Unsupported FormDataPart implementation" on the New
  // Architecture's networking module. Fetching the local file URI gives a
  // real Blob, which is what it actually requires now.
  const response = await fetch(asset.uri);
  const rawBlob = await response.blob();
  const blob = new Blob([rawBlob], { type: asset.mimeType ?? "image/jpeg" });
  formData.append("image", blob, asset.fileName ?? "receipt.jpg");
  return formData;
}

export function useScanFlow(onConfirmed: () => void) {
  const [phase, setPhase] = useState<ScanPhase>("pick");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const current = await getReceipt(id);
          if (current.status !== "processing") {
            stopPolling();
            setReceipt(current);
            setPhase("review");
          }
        } catch (err) {
          stopPolling();
          setError(describeError(err, "Lost connection while parsing"));
          setPhase("error");
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const upload = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      setPhase("uploading");
      setError(null);
      try {
        const formData = await buildFormData(asset);
        const uploaded = await uploadReceipt(formData);
        setPhase("processing");
        startPolling(uploaded.id);
      } catch (err) {
        setError(describeError(err, "Couldn't upload that photo"));
        setPhase("error");
      }
    },
    [startPolling],
  );

  const pickFromLibrary = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("Photo library access is needed to upload a receipt.");
      setPhase("error");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    upload(result.assets[0]);
  }, [upload]);

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError("Camera access is needed to take a photo of a receipt.");
      setPhase("error");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    upload(result.assets[0]);
  }, [upload]);

  const correctItem = useCallback(
    async (itemId: string, categoryId: string) => {
      if (!receipt) return;
      const previous = receipt;
      try {
        const updated = await patchReceiptItem(receipt.id, itemId, { categoryId });
        setReceipt(updated);
      } catch (err) {
        setReceipt(previous);
        setConfirmError(describeError(err, "Couldn't update that item"));
      }
    },
    [receipt],
  );

  const updateItemMass = useCallback(
    async (itemId: string, massKg: number) => {
      if (!receipt) return;
      const previous = receipt;
      try {
        const updated = await patchReceiptItem(receipt.id, itemId, { massKg });
        setReceipt(updated);
      } catch (err) {
        setReceipt(previous);
        setConfirmError(describeError(err, "Couldn't update that item"));
      }
    },
    [receipt],
  );

  const confirm = useCallback(async () => {
    if (!receipt) return;
    setPhase("confirming");
    setConfirmError(null);
    try {
      await confirmReceipt(receipt.id);
      onConfirmed();
    } catch (err) {
      setConfirmError(describeError(err, "Couldn't confirm this receipt"));
      setPhase("review");
    }
  }, [receipt, onConfirmed]);

  const retry = useCallback(() => {
    stopPolling();
    setError(null);
    setConfirmError(null);
    setReceipt(null);
    setPhase("pick");
  }, [stopPolling]);

  return {
    phase,
    receipt,
    error,
    confirmError,
    pickFromLibrary,
    takePhoto,
    correctItem,
    updateItemMass,
    confirm,
    retry,
  };
}
