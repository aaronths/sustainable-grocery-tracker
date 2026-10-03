import { useCallback, useEffect, useState } from "react";
import { Share } from "react-native";
import { useFocusEffect } from "expo-router";

import { ApiError } from "@/api/client";
import { getDashboard, getLeague, getLeagues, getMe } from "@/api/resources";
import type { League, LeagueKind } from "@/api/types";

export type LeaguesData = {
  currentUserId: string;
  leaguesByKind: Record<LeagueKind, League | null>;
  daysLeft: number;
};

type Status = "loading" | "error" | "ready";

const KINDS: LeagueKind[] = ["friends", "campus", "global"];

export function useLeaguesData() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<LeaguesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (background: boolean) => {
    if (background) setRefreshing(true);
    try {
      const [me, leagues, dashboard] = await Promise.all([getMe(), getLeagues(), getDashboard()]);

      const leaguesByKind = Object.fromEntries(
        await Promise.all(
          KINDS.map(async (kind) => {
            const summary = leagues.find((l) => l.kind === kind);
            if (!summary) return [kind, null] as const;
            const detail = await getLeague(summary.id);
            return [kind, detail] as const;
          }),
        ),
      ) as Record<LeagueKind, League | null>;

      setData({ currentUserId: me.id, leaguesByKind, daysLeft: dashboard.daysLeft });
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

  const invite = useCallback((league: League) => {
    Share.share({ message: `Join me on GreenGro! Use invite code ${league.inviteCode}.` });
  }, []);

  return { status, data, error, refreshing, refetch: () => fetchAll(true), invite };
}
