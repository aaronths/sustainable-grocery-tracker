import { type ReactNode, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Award, ChevronRight, Flame, Leaf, Sprout } from "lucide-react-native";

import { HowItWorksSheet } from "@/components/HowItWorksSheet";
import { ScreenState } from "@/components/ScreenState";
import { Tile } from "@/components/Tile";
import { useProfileData } from "@/features/profile/useProfileData";
import { colors } from "@/lib/colors";
import { pluralize } from "@/lib/plural";
import { revealEntrance } from "@/lib/motion";

function Row({ label, value, isLast }: { label: string; value: string; isLast?: boolean }) {
  return (
    <View className={`flex-row items-start justify-between gap-4 py-3 ${isLast ? "" : "border-b border-sage/20"}`}>
      <Text className="font-body text-ink">{label}</Text>
      <Text className="flex-1 text-right font-body-medium text-ink">{value}</Text>
    </View>
  );
}

function LinkRow({ label, onPress, isLast }: { label: string; onPress: () => void; isLast?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between py-3 active:opacity-60 ${isLast ? "" : "border-b border-sage/20"}`}
    >
      <Text className="font-body text-ink">{label}</Text>
      <ChevronRight size={18} color={colors.muted} />
    </Pressable>
  );
}

type Achievement = {
  icon: typeof Flame;
  color: string;
  label: string;
};

const ACHIEVEMENTS: Achievement[] = [
  { icon: Flame, color: colors.amber, label: "Long Streak" },
  { icon: Leaf, color: colors.leaf, label: "First Offset" },
  { icon: Award, color: colors.orange, label: "Bronze Contributor" },
  { icon: Sprout, color: colors.moss, label: "GreenGro Founder" },
];

function AchievementBadge({ icon: Icon, color, label }: Achievement) {
  return (
    <View className="w-20 items-center gap-2">
      <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
        <Icon size={24} color={colors.surface} />
      </View>
      <Text className="text-center font-body text-xs text-ink" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, index, children }: { title: string; index: number; children: ReactNode }) {
  return (
    <Animated.View entering={revealEntrance(index)} className="gap-1">
      <Text className="font-body-medium text-xs tracking-widest text-muted">{title}</Text>
      <View className="rounded-card bg-surface px-5">{children}</View>
    </Animated.View>
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
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);

  return (
    <SafeAreaView edges={["top"]} className="flex-1">
      <ScrollView contentContainerClassName="gap-5 px-5 pb-10 pt-4" showsVerticalScrollIndicator={false}>
        <Animated.View entering={revealEntrance(0)} className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-moss">
            <Text className="font-display text-lg text-surface">{profile.initials}</Text>
          </View>
          <View>
            <Text className="font-display text-xl text-ink">{profile.name}</Text>
            <Text className="font-body text-sm text-muted">Scanning since {scanningSince}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={revealEntrance(1)} className="flex-row gap-3">
          <Tile label="Current streak" value={String(profile.streak.current)} />
          <Tile label="Best streak" value={String(profile.streak.best)} />
          <Tile label="Baseline, kg" value={profile.streak.baselineKg.toFixed(1)} />
        </Animated.View>

        <Animated.View entering={revealEntrance(2)} className="gap-2">
          <Text className="font-body-medium text-xs tracking-widest text-muted">ACHIEVEMENTS</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-4"
          >
            {ACHIEVEMENTS.map((achievement) => (
              <AchievementBadge key={achievement.label} {...achievement} />
            ))}
          </ScrollView>
        </Animated.View>

        <Section title="STREAK RULES" index={3}>
          <Row label="Baseline" value={`Lowest week · ${profile.streak.baselineKg.toFixed(1)} kg`} />
          <Row label="Streak limit" value="Baseline + 10%" />
          <Row
            label="Streak saves"
            value={profile.streak.savesUsed === 0 ? "No offsets used yet" : pluralize(profile.streak.savesUsed, "offset used", "offsets used")}
            isLast
          />
        </Section>

        <Section title="OFFSETS" index={4}>
          <Row label="Provider" value="GreenGro Offsets" />
          <Row
            label="Total offset"
            value={`${offsetHistory.totalKgOffset.toFixed(1)} kg · $${(offsetHistory.totalCentsSpent / 100).toFixed(2)}`}
          />
          <Row label="Service fee" value="5% of each offset" isLast />
        </Section>

        <Section title="RECEIPTS" index={5}>
          <Row label="Scan by" value="Camera, email forward" />
          <Row label="Stores seen" value={storesSeen || "None yet"} isLast />
        </Section>

        <Section title="ABOUT" index={6}>
          <LinkRow label="How does GreenGro work?" onPress={() => setHowItWorksVisible(true)} isLast />
        </Section>
      </ScrollView>

      <HowItWorksSheet visible={howItWorksVisible} onClose={() => setHowItWorksVisible(false)} />
    </SafeAreaView>
  );
}
