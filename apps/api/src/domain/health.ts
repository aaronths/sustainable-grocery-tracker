// zodOutputFormat() builds its JSON schema from zod/v4 internals specifically
// (not the classic v3 API the rest of this app's routes use for validation),
// matching the subpath stubs/parser.ts builds its schema against.
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "../lib/anthropicClient";
import type { PatientRecords } from "../stubs/finchnode";
import type { Category, DietFlag, HealthRecommendation, LineItem } from "./types";
import { round1 } from "./scoring";

const DIET_FLAG_VALUES = ["low-fat", "low-carb", "high-protein", "low-calorie"] as const;

export interface HealthProfile {
  dietFlags: DietFlag[];
  allergyAlerts: string[];
}

const CONDITION_KEYWORDS: Array<{ pattern: RegExp; flag: DietFlag }> = [
  { pattern: /cholesterol|hyperlipidemia|cardio|heart/i, flag: "low-fat" },
  { pattern: /diabet|glucose|insulin/i, flag: "low-carb" },
  { pattern: /obes|overweight/i, flag: "low-calorie" },
  { pattern: /underweight|malnutrition|muscle wasting/i, flag: "high-protein" },
];

/** Deterministic substring match on condition names — used as the fallback
 * when the Claude classification call fails for any reason. */
function classifyHeuristically(records: PatientRecords): DietFlag[] {
  const flags = new Set<DietFlag>();
  for (const condition of records.conditions) {
    for (const { pattern, flag } of CONDITION_KEYWORDS) {
      if (pattern.test(condition.name)) flags.add(flag);
    }
  }
  return Array.from(flags);
}

const ClassificationSchema = z.object({
  dietFlags: z
    .array(z.enum(DIET_FLAG_VALUES))
    .describe("Umbrella diet guidance flags clearly supported by the patient's conditions"),
});

/**
 * Classifies a patient's diagnosed conditions into a small set of umbrella
 * diet flags via Claude, constrained to the fixed DietFlag enum. Falls back
 * to a deterministic keyword matcher on any failure (missing key, network
 * error, no parsed output) — same try/catch-with-fallback shape as
 * stubs/parser.ts, so the health-insights route never hard-fails.
 */
export async function classifyHealthProfile(records: PatientRecords): Promise<HealthProfile> {
  const allergyAlerts = records.allergies.map((a) => a.substance);

  if (records.conditions.length === 0) {
    return { dietFlags: [], allergyAlerts };
  }

  try {
    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system:
        "You are a clinical dietitian assistant. Given a patient's diagnosed " +
        "conditions, decide which of these umbrella diet guidance flags clearly " +
        "apply (zero or more; only when well supported by the conditions, never guess):\n" +
        "- low-fat: conditions related to cholesterol or cardiovascular risk\n" +
        "- low-carb: conditions related to diabetes or blood glucose control\n" +
        "- low-calorie: conditions related to obesity or excess weight\n" +
        "- high-protein: conditions related to being underweight or malnourished",
      messages: [
        {
          role: "user",
          content:
            "Conditions:\n" +
            records.conditions.map((c) => `- ${c.name}${c.status ? ` (${c.status})` : ""}`).join("\n"),
        },
      ],
      output_config: { format: zodOutputFormat(ClassificationSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Claude did not return a parseable classification");

    return { dietFlags: parsed.dietFlags, allergyAlerts };
  } catch (error) {
    console.error("classifyHealthProfile: falling back to keyword classifier:", error);
    return { dietFlags: classifyHeuristically(records), allergyAlerts };
  }
}

interface FlagMetric {
  categoryField: "fatGPerKg" | "carbsGPerKg" | "kcalPerKg" | "proteinGPerKg";
  direction: "minimize" | "maximize";
}

const FLAG_METRICS: Record<DietFlag, FlagMetric> = {
  "low-fat": { categoryField: "fatGPerKg", direction: "minimize" },
  "low-carb": { categoryField: "carbsGPerKg", direction: "minimize" },
  "low-calorie": { categoryField: "kcalPerKg", direction: "minimize" },
  "high-protein": { categoryField: "proteinGPerKg", direction: "maximize" },
};

/**
 * One recommendation per diet flag, same shape as computeHeroSwap() in
 * routes/swaps.ts: for each of this week's confirmed items, find the best
 * same-group alternative category on the flag's metric, and keep whichever
 * item/alternative pair would move the needle the most (density delta times
 * the item's purchased mass) — no ranked list, just the single best idea per
 * flag, mirroring the "biggest win" simplicity of the CO2e swap engine.
 */
export function computeHealthRecommendations(
  dietFlags: DietFlag[],
  items: LineItem[],
  categories: Category[],
): HealthRecommendation[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const recommendations: HealthRecommendation[] = [];

  for (const flag of dietFlags) {
    const metric = FLAG_METRICS[flag];
    let best: { item: LineItem; alt: Category; gain: number } | null = null;

    for (const item of items) {
      const category = categoryById.get(item.categoryId);
      if (!category) continue;

      let bestAlt: Category | null = null;
      let bestDelta = 0;
      for (const alt of categories) {
        if (alt.group !== category.group || alt.id === category.id) continue;
        const delta =
          metric.direction === "minimize"
            ? category[metric.categoryField] - alt[metric.categoryField]
            : alt[metric.categoryField] - category[metric.categoryField];
        if (delta > bestDelta) {
          bestDelta = delta;
          bestAlt = alt;
        }
      }
      if (!bestAlt) continue;

      const gain = bestDelta * item.massKg;
      if (!best || gain > best.gain) {
        best = { item, alt: bestAlt, gain };
      }
    }

    if (!best) continue;
    recommendations.push({
      dietFlag: flag,
      fromName: best.item.name,
      toName: best.alt.name,
      context: "From this week's groceries",
      impactAmount: metric.categoryField === "kcalPerKg" ? Math.round(best.gain) : round1(best.gain),
    });
  }

  return recommendations;
}
