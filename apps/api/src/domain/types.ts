export interface UserSettings {
  units: "metric" | "imperial";
  notifications: boolean;
}

export interface User {
  id: string;
  name: string;
  initials: string;
  createdAt: string;
  settings: UserSettings;
}

export type WeekStatus = "below" | "within" | "over";
export type WeekOutcome = "new_low" | "kept" | "offset" | "broken" | "open";

export interface Week {
  id: string;
  startDate: string;
  endDate: string;
  totalKg: number;
  baselineAtClose: number;
  limitAtClose: number;
  status: WeekStatus;
  outcome: WeekOutcome;
  closed: boolean;
}

export interface StreakState {
  current: number;
  best: number;
  baselineKg: number;
  savesUsed: number;
}

export type ReceiptStatus = "processing" | "ready" | "confirmed";

export interface LineItem {
  id: string;
  rawText: string;
  name: string;
  categoryId: string;
  quantity: number;
  massKg: number;
  kgCo2e: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  confidence: number;
}

export interface Receipt {
  id: string;
  weekId: string;
  store: string;
  uploadedAt: string;
  status: ReceiptStatus;
  items: LineItem[];
}

export type CategoryGroup =
  | "Meat & fish"
  | "Dairy & eggs"
  | "Produce"
  | "Grains & bakery"
  | "Snacks & drinks";

export interface Category {
  id: string;
  name: string;
  group: CategoryGroup;
  kgCo2ePerKg: number;
  kcalPerKg: number;
  proteinGPerKg: number;
  carbsGPerKg: number;
  fatGPerKg: number;
  /** A standard grocery portion/package weight — used to replace a low-confidence mass guess. */
  typicalMassKg: number;
}

export interface Swap {
  id: string;
  fromName: string;
  toName: string;
  context: string;
  savingKg: number;
  committed: boolean;
}

export interface SwapsResponse {
  hero: Swap | null;
  ideas: Swap[];
}

export interface Challenge {
  id: string;
  title: string;
  target: number;
  progress: number;
  endsAt: string;
}

export interface OffsetQuote {
  id: string;
  kg: number;
  costCents: number;
  feeCents: number;
  totalCents: number;
  provider: string;
  project: string;
  expiresAt: string;
}

export interface Offset {
  id: string;
  quoteId: string;
  weekId: string;
  kg: number;
  totalCents: number;
  createdAt: string;
}

export type LeagueKind = "friends" | "campus" | "global";

export interface LeagueMember {
  userId: string;
  name: string;
  initials: string;
  streak: number;
  pctVsBaseline: number;
}

export interface League {
  id: string;
  name: string;
  kind: LeagueKind;
  inviteCode: string;
  members: LeagueMember[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface ProfileResponse extends User {
  streak: StreakState;
}

export interface DashboardResponse {
  weekId: string;
  startDate: string;
  endDate: string;
  total: number;
  baseline: number;
  limit: number;
  status: WeekStatus;
  headroomKg: number;
  excessKg: number;
  streak: number;
  daysLeft: number;
}

export interface CategoryStat {
  group: CategoryGroup;
  avgKgCo2e: number;
}

export interface MacroGroupStat {
  group: CategoryGroup;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MacroStatsResponse {
  weekId: string;
  totalKcal: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  byGroup: MacroGroupStat[];
}

export interface OffsetHistoryResponse {
  offsets: Offset[];
  totalKgOffset: number;
  totalCentsSpent: number;
}

export interface CloseWeekResponse {
  week: Week;
  streak: StreakState;
  newLow: boolean;
  outcome: WeekOutcome;
}

export type DietFlag = "low-fat" | "low-carb" | "high-protein" | "low-calorie";

export interface HealthRecommendation {
  dietFlag: DietFlag;
  fromName: string;
  toName: string;
  context: string;
}

export interface HealthRecommendationsResponse {
  dietFlags: DietFlag[];
  allergyAlerts: string[];
  recommendations: HealthRecommendation[];
}
