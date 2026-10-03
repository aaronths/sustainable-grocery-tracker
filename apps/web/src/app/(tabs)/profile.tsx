import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenState } from "@/components/ScreenState";
import { Tile } from "@/components/Tile";
import { useProfileData } from "@/features/profile/useProfileData";
import { pluralize } from "@/lib/plural";

function Row({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${isLast ? "" : "border-b border-sage/20"}`}>
      <Text className="font-body text-ink">{label}</Text>
      <Text className="font-body-medium text-ink">{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text className="font-body-medium text-xs tracking-widest text-muted">{title}</Text>
      <View className="rounded-card bg-surface px-5">{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const profileData = useProfileData();

  return (
    <View className="flex-1 bg-mist">
      <ScreenState
        loading={profileData.status === "loading"}
        error={profileData.status === "error" ? profileData.error : null}
        onRetry={profileData.refetch}
      >
        {profileData.data ? <ProfileContent data={profileData.data} /> : null}
      </ScreenState>
    </View>
  );
}

function ProfileContent({ data }: { data: NonNullable<ReturnType<typeof useProfileData>["data"]> }) {
  const { profile, offsetHistory, storesSeen } = data;
  const scanningSince = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-moss">
            <Text className="font-display text-lg text-surface">{profile.initials}</Text>
          </View>
          <View>
            <Text className="font-display text-xl text-ink">{profile.name}</Text>
            <Text className="font-body text-sm text-muted">Scanning since {scanningSince}</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <Tile label="Current streak" value={String(profile.streak.current)} />
          <Tile label="Best streak" value={String(profile.streak.best)} />
          <Tile label="Baseline, kg" value={profile.streak.baselineKg.toFixed(1)} />
        </View>

        <Section title="STREAK RULES">
          <Row label="Baseline" value={`Lowest week · ${profile.streak.baselineKg.toFixed(1)} kg`} />
          <Row label="Streak limit" value="Baseline + 10%" />
          <Row
            label="Streak saves"
            value={profile.streak.savesUsed === 0 ? "No offsets used yet" : pluralize(profile.streak.savesUsed, "offset used", "offsets used")}
            isLast
          />
        </Section>

        <Section title="OFFSETS">
          <Row label="Provider" value="GreenGro Offsets" />
          <Row
            label="Total offset"
            value={`${offsetHistory.totalKgOffset.toFixed(1)} kg · $${(offsetHistory.totalCentsSpent / 100).toFixed(2)}`}
          />
          <Row label="Service fee" value="5% of each offset" isLast />
        </Section>

        <Section title="RECEIPTS">
          <Row label="Scan by" value="Camera, email forward" />
          <Row label="Stores seen" value={storesSeen || "None yet"} isLast />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}
