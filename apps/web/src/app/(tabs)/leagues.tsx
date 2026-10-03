import { useState } from "react";
import { Info } from "lucide-react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/components/ScreenState";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useLeaguesData } from "@/features/leagues/useLeaguesData";
import { colors } from "@/lib/colors";
import type { League, LeagueKind, LeagueMember } from "@/api/types";

const TAB_OPTIONS: { value: LeagueKind; label: string }[] = [
  { value: "friends", label: "Friends" },
  { value: "campus", label: "Campus" },
  { value: "global", label: "Global" },
];

export default function LeaguesScreen() {
  const leagues = useLeaguesData();
  const [kind, setKind] = useState<LeagueKind>("friends");

  return (
    <View className="flex-1 bg-mist">
      <ScreenState
        loading={leagues.status === "loading"}
        error={leagues.status === "error" ? leagues.error : null}
        onRetry={leagues.refetch}
      >
        {leagues.data ? (
          <SafeAreaView edges={["top"]} className="flex-1">
            <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
              <Text className="font-display text-2xl text-ink">Leagues</Text>
              <SegmentedControl options={TAB_OPTIONS} value={kind} onChange={setKind} />

              <LeagueContent
                league={leagues.data.leaguesByKind[kind]}
                currentUserId={leagues.data.currentUserId}
                daysLeft={leagues.data.daysLeft}
                onInvite={leagues.invite}
              />
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </ScreenState>
    </View>
  );
}

function LeagueContent({
  league,
  currentUserId,
  daysLeft,
  onInvite,
}: {
  league: League | null;
  currentUserId: string;
  daysLeft: number;
  onInvite: (league: League) => void;
}) {
  if (!league) {
    return (
      <View className="rounded-card bg-surface px-5 py-8">
        <Text className="text-center font-body text-muted">No leagues yet in this category.</Text>
      </View>
    );
  }

  return (
    <>
      <View className="gap-0.5">
        <Text className="font-display text-lg text-ink">{league.name}</Text>
        <Text className="font-body text-sm text-muted">
          {league.members.length} members · resets in {daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
        </Text>
      </View>

      <View className="flex-row items-start gap-2.5 rounded-card bg-sage/25 px-4 py-4">
        <Info size={18} color={colors.ink} />
        <Text className="flex-1 font-body text-sm text-ink">
          Ranked by how far below your own baseline you finish, not raw totals, so every diet
          competes fairly.
        </Text>
      </View>

      <View className="rounded-card bg-surface px-3 py-2">
        {league.members.map((member, index) => (
          <MemberRow
            key={member.userId}
            member={member}
            rank={index + 1}
            isSelf={member.userId === currentUserId}
            isLast={index === league.members.length - 1}
          />
        ))}
      </View>

      <Pressable
        onPress={() => onInvite(league)}
        className="min-h-[44px] items-center justify-center rounded-btn border border-moss px-5 py-3"
      >
        <Text className="font-body-medium text-moss">Invite friends</Text>
      </Pressable>
    </>
  );
}

function MemberRow({
  member,
  rank,
  isSelf,
  isLast,
}: {
  member: LeagueMember;
  rank: number;
  isSelf: boolean;
  isLast: boolean;
}) {
  const pctColor = member.pctVsBaseline < 0 ? "text-leaf" : member.pctVsBaseline > 0 ? "text-ember" : "text-ink";

  return (
    <View
      className={`flex-row items-center gap-3 px-2 py-3 ${isLast ? "" : "border-b border-sage/20"} ${
        isSelf ? "rounded-tile bg-sage/20" : ""
      }`}
    >
      <Text className="w-4 font-body-medium text-muted">{rank}</Text>
      <View
        className={`h-10 w-10 items-center justify-center rounded-full ${isSelf ? "bg-moss" : "bg-sage/50"}`}
      >
        <Text className={`font-body-medium text-sm ${isSelf ? "text-surface" : "text-ink"}`}>
          {member.initials}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-body-medium text-ink">{isSelf ? "You" : member.name}</Text>
        <Text className="font-body text-sm text-muted">{member.streak}-week streak</Text>
      </View>
      <Text className={`font-body-medium ${pctColor}`}>
        {member.pctVsBaseline > 0 ? "+" : ""}
        {member.pctVsBaseline}%
      </Text>
    </View>
  );
}
