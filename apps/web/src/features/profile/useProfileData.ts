import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { getMe, getOffsets, getReceipts } from "@/api/resources";
import type { OffsetHistoryResponse, ProfileResponse } from "@/api/types";

export type ProfileData = {
  profile: ProfileResponse;
  offsetHistory: OffsetHistoryResponse;
  storesSeen: string;
};

type Status = "loading" | "error" | "ready";

export function useProfileData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (background: boolean) => {
    if (background) setRefreshing(true);
    try {
      const [profile, offsetHistory, receipts] = await Promise.all([
        getMe(),
        getOffsets(),
        getReceipts(),
      ]);
      const storesSeen = Array.from(new Set(receipts.map((r) => r.store))).sort().join(", ");
      setData({ profile, offsetHistory, storesSeen });
      setStatus("ready");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the server");
      setStatus((prev) => (prev === "ready" ? prev : "error"));
    } finally {
      if (background) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll(true);
    }, [fetchAll]),
  );

  return { status, data, error, refreshing, refetch: () => fetchAll(true) };
}
