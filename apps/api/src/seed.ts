import { makeId } from "./lib/ids";
import {
  closeWeek,
  computeLimit,
  computeOffsetQuote,
  computeStatus,
  getWeekWindow,
  round1,
  shiftWeekWindow,
} from "./domain/scoring";
import { computeMacros } from "./domain/nutrition";
import type {
  Category,
  Challenge,
  League,
  LineItem,
  Offset,
  OffsetQuote,
  Receipt,
  StreakState,
  Swap,
  User,
  Week,
} from "./domain/types";
import categoriesData from "./data/categories.json";

export interface StoreState {
  user: User;
  weeks: Week[]; // oldest first; last entry is the open week (closed: false)
  streak: StreakState;
  receipts: Receipt[];
  categories: Category[];
  swaps: Swap[];
  challenges: Challenge[];
  offsetQuotes: Map<string, OffsetQuote>;
  offsets: Offset[];
  leagues: League[];
  /** Set once the user links their Finchnode sandbox patient record. */
  linkedPatientId: string | null;
}

const CATEGORIES = categoriesData as Category[];

function categoryOf(categoryId: string): Category {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown seed category: ${categoryId}`);
  return category;
}

function factorOf(categoryId: string): number {
  return categoryOf(categoryId).kgCo2ePerKg;
}

function makeLineItem(opts: {
  rawText: string;
  name: string;
  categoryId: string;
  massKg: number;
  confidence: number;
  quantity?: number;
}): LineItem {
  const massKg = round1(opts.massKg);
  const category = categoryOf(opts.categoryId);
  return {
    id: makeId("item"),
    rawText: opts.rawText,
    name: opts.name,
    categoryId: opts.categoryId,
    quantity: opts.quantity ?? 1,
    massKg,
    kgCo2e: round1(massKg * category.kgCo2ePerKg),
    ...computeMacros(massKg, category),
    confidence: opts.confidence,
  };
}

const STORE_NAMES = ["Kroger", "Trader Joe's", "Whole Foods", "Aldi", "Meijer"];

// group -> representative category + weekly share of a closed week's total
const GROUP_RECIPE: Array<{ categoryId: string; share: number }> = [
  { categoryId: "chicken", share: 0.45 }, // Meat & fish
  { categoryId: "cheese", share: 0.2 }, // Dairy & eggs
  { categoryId: "tomatoes", share: 0.15 }, // Produce
  { categoryId: "bread", share: 0.1 }, // Grains & bakery
  { categoryId: "coffee", share: 0.1 }, // Snacks & drinks
];

function buildClosedWeekReceipt(week: Week, index: number): Receipt {
  const shares = GROUP_RECIPE.map((r) => round1(week.totalKg * r.share));
  // force an exact match with the week total by absorbing rounding in the last item
  const exactLast = round1(
    week.totalKg - shares.slice(0, -1).reduce((a, b) => a + b, 0)
  );
  shares[shares.length - 1] = exactLast;

  const items = GROUP_RECIPE.map((recipe, i) => {
    const factor = factorOf(recipe.categoryId);
    const kgCo2e = shares[i];
    const massKg = round1(kgCo2e / factor);
    const category = CATEGORIES.find((c) => c.id === recipe.categoryId)!;
    return makeLineItem({
      rawText: category.name.toUpperCase(),
      name: category.name,
      categoryId: recipe.categoryId,
      massKg,
      confidence: 0.9,
    });
  });

  return {
    id: makeId("rcpt"),
    weekId: week.id,
    store: STORE_NAMES[index % STORE_NAMES.length],
    uploadedAt: `${week.endDate}T18:00:00.000Z`,
    status: "confirmed",
    items,
  };
}

export function buildSeed(now: Date = new Date()): StoreState {
  const openWindow = getWeekWindow(now);

  const CLOSED_TOTALS = [
    36.2, 34.8, 35.9, 33.5, 33.0, 31.8, 32.4, 33.6, 32.0, 37.2, 33.1, 28.4,
  ];
  // index 9 (total 37.2) is the week saved by an offset purchase, per the brief
  const OFFSET_WEEK_INDEX = 9;

  let streak: StreakState = {
    current: 0,
    best: 0,
    baselineKg: CLOSED_TOTALS[0],
    savesUsed: 0,
  };
  let runningBaseline = CLOSED_TOTALS[0];

  const weeks: Week[] = [];
  const offsets: Offset[] = [];

  CLOSED_TOTALS.forEach((totalKg, i) => {
    const isFirstWeek = i === 0;
    const window = shiftWeekWindow(openWindow, i - CLOSED_TOTALS.length);
    const baselineGoingIn = runningBaseline;

    const result = closeWeek({
      totalKg,
      baselineKg: baselineGoingIn,
      streak,
      hasCoveringOffset: i === OFFSET_WEEK_INDEX,
      isFirstWeek,
    });

    streak = result.streak;
    runningBaseline = result.newBaselineKg;

    const week: Week = {
      id: makeId("week"),
      startDate: window.startDate,
      endDate: window.endDate,
      totalKg,
      baselineAtClose: baselineGoingIn,
      limitAtClose: result.limitKg,
      status: result.status,
      outcome: result.outcome,
      closed: true,
    };
    weeks.push(week);

    if (result.outcome === "offset") {
      const quote = computeOffsetQuote(totalKg, result.limitKg, 4000)!;
      offsets.push({
        id: makeId("offset"),
        quoteId: makeId("quote"),
        weekId: week.id,
        kg: quote.kg,
        totalCents: quote.totalCents,
        createdAt: `${week.endDate}T20:00:00.000Z`,
      });
    }
  });

  // The visible 12-week window simulates to current == best (no break inside
  // it); the brief's best:17 implies an earlier streak, off-screen, that broke
  // before this window started. current and savesUsed from the simulation
  // match the brief exactly, so only best is overridden.
  streak = { ...streak, best: 17 };

  const baseline = streak.baselineKg; // 28.4
  const limit = computeLimit(baseline);
  const openTotal = 33.1;

  const openWeek: Week = {
    id: makeId("week"),
    startDate: openWindow.startDate,
    endDate: openWindow.endDate,
    totalKg: openTotal,
    baselineAtClose: baseline,
    limitAtClose: limit,
    status: computeStatus(openTotal, baseline, limit),
    outcome: "open",
    closed: false,
  };
  weeks.push(openWeek);

  const closedReceipts = weeks
    .slice(0, -1)
    .map((week, i) => buildClosedWeekReceipt(week, i));

  const openWeekReceipts: Receipt[] = [
    {
      id: makeId("rcpt"),
      weekId: openWeek.id,
      store: "Kroger",
      uploadedAt: `${openWeek.startDate}T13:00:00.000Z`,
      status: "confirmed",
      items: [
        makeLineItem({
          rawText: "80/20 GRND BEEF",
          name: "Ground beef",
          categoryId: "beef",
          massKg: 0.15,
          confidence: 0.93,
        }),
        makeLineItem({
          rawText: "WHOLE WHEAT BREAD",
          name: "Bread",
          categoryId: "bread",
          massKg: 0.3,
          confidence: 0.95,
        }),
        makeLineItem({
          rawText: "ORG BANANAS",
          name: "Bananas",
          categoryId: "bananas",
          massKg: 1.1,
          confidence: 0.62,
        }),
      ],
    },
    {
      id: makeId("rcpt"),
      weekId: openWeek.id,
      store: "Trader Joe's",
      uploadedAt: `${openWeek.startDate}T15:00:00.000Z`,
      status: "confirmed",
      items: [
        makeLineItem({
          rawText: "CHKN BRST BNLS",
          name: "Chicken breast",
          categoryId: "chicken",
          massKg: 0.6,
          confidence: 0.9,
        }),
        makeLineItem({
          rawText: "SHARP CHEDDAR",
          name: "Cheese",
          categoryId: "cheese",
          massKg: 0.4,
          confidence: 0.88,
        }),
        makeLineItem({
          rawText: "WHOLE BEAN COFFEE",
          name: "Coffee",
          categoryId: "coffee",
          massKg: 0.22,
          confidence: 0.68,
        }),
      ],
    },
    {
      id: makeId("rcpt"),
      weekId: openWeek.id,
      store: "Whole Foods",
      uploadedAt: `${openWeek.startDate}T17:00:00.000Z`,
      status: "confirmed",
      items: [
        makeLineItem({
          rawText: "ATL SALMON FILLET",
          name: "Farmed salmon",
          categoryId: "salmon",
          massKg: 0.5,
          confidence: 0.86,
        }),
        makeLineItem({
          rawText: "JASMINE RICE",
          name: "Rice",
          categoryId: "rice",
          massKg: 1.0,
          confidence: 0.97,
        }),
        makeLineItem({
          rawText: "LRG EGGS DOZEN",
          name: "Eggs",
          categoryId: "eggs",
          massKg: 0.8,
          confidence: 0.92,
        }),
        makeLineItem({
          rawText: "WHOLE MILK GAL",
          name: "Milk",
          categoryId: "milk",
          massKg: 1.0,
          confidence: 0.94,
        }),
      ],
    },
  ];

  const receipts = [...closedReceipts, ...openWeekReceipts];

  const user: User = {
    id: "u_demo",
    name: "Aaron Siew",
    initials: "AS",
    createdAt: `${weeks[0].startDate}T00:00:00.000Z`,
    settings: { units: "metric", notifications: true },
  };

  const swaps: Swap[] = [
    {
      id: makeId("swap"),
      fromName: "Ground beef",
      toName: "Lentils",
      context: "In tonight's chili",
      savingKg: 4.8,
      committed: false,
    },
    {
      id: makeId("swap"),
      fromName: "Cheese",
      toName: "Nutritional yeast",
      context: "On pasta night",
      savingKg: 2.1,
      committed: false,
    },
    {
      id: makeId("swap"),
      fromName: "Farmed shrimp",
      toName: "Canned tuna",
      context: "For your stir-fry",
      savingKg: 1.6,
      committed: false,
    },
    {
      id: makeId("swap"),
      fromName: "Coffee",
      toName: "Tea",
      context: "Your morning cup",
      savingKg: 1.0,
      committed: true,
    },
    {
      id: makeId("swap"),
      fromName: "Potato chips",
      toName: "Air-popped popcorn",
      context: "Snack swap",
      savingKg: 0.4,
      committed: false,
    },
  ];

  const challenges: Challenge[] = [
    {
      id: makeId("chal"),
      title: "Go meat-free twice this week",
      target: 2,
      progress: 0,
      endsAt: `${openWeek.endDate}T23:59:59.000Z`,
    },
  ];

  const leagues: League[] = [
    {
      id: makeId("league"),
      name: "Neighborhood Composters",
      kind: "friends",
      inviteCode: "LEAFY42",
      members: [
        {
          userId: "u_friend_1",
          name: "Nicolette L.",
          initials: "NL",
          streak: 9,
          pctVsBaseline: -8.2,
        },
        {
          userId: "u_friend_2",
          name: "Brandon W.",
          initials: "BW",
          streak: 15,
          pctVsBaseline: -3.4,
        },
        {
          userId: "u_friend_3",
          name: "Rebecca C.",
          initials: "RC",
          streak: 7,
          pctVsBaseline: 0.0,
        },
        {
          userId: "u_friend_4",
          name: "Anthony L.",
          initials: "AL",
          streak: 4,
          pctVsBaseline: 5.1,
        },
        {
          userId: user.id,
          name: user.name,
          initials: user.initials,
          streak: streak.current,
          pctVsBaseline: round1(((openTotal - baseline) / baseline) * 100),
        },
      ],
    },
  ];

  return {
    user,
    weeks,
    streak,
    receipts,
    categories: CATEGORIES,
    swaps,
    challenges,
    offsetQuotes: new Map(),
    offsets,
    leagues,
    linkedPatientId: null,
  };
}
