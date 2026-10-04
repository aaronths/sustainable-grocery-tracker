// zodOutputFormat() builds its JSON schema from zod/v4 internals specifically
// (not the classic v3 API the rest of this app's routes use for validation),
// so this schema is built against that subpath.
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "../lib/anthropicClient";
import { makeId } from "../lib/ids";
import { LOW_CONFIDENCE_THRESHOLD, round1 } from "../domain/scoring";
import { computeMacros } from "../domain/nutrition";
import categoriesData from "../data/categories.json";
import type { Category, LineItem } from "../domain/types";
import { cannedReceiptItems } from "./cannedReceipt";

const CATEGORIES = categoriesData as Category[];
const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];

function isSupportedImageType(mime: string): mime is SupportedImageType {
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(mime);
}

const ParsedLineItemSchema = z.object({
  rawText: z.string().describe("The exact text as it appears on the receipt line"),
  name: z.string().describe("A clean, human-readable product name"),
  categoryId: z.enum(CATEGORY_IDS).describe("Best-matching category id from the provided list"),
  massKg: z.number().positive().describe("Estimated total mass of this line item, in kilograms"),
  kcal: z.number().nonnegative().describe("Estimated total calories for this line item's full purchased quantity"),
  proteinG: z.number().nonnegative().describe("Estimated total protein, in grams, for this line item's full purchased quantity"),
  carbsG: z.number().nonnegative().describe("Estimated total carbohydrates, in grams, for this line item's full purchased quantity"),
  fatG: z.number().nonnegative().describe("Estimated total fat, in grams, for this line item's full purchased quantity"),
  confidence: z.number().min(0).max(1).describe("Self-assessed confidence in the category match, 0 to 1"),
});

const ParsedReceiptSchema = z.object({
  store: z
    .string()
    .describe(
      'The store/retailer name printed on the receipt (header, logo, or footer text). Use "Unknown store" if it is not legible or not present.',
    ),
  items: z.array(ParsedLineItemSchema),
});

function categoryContext(): string {
  return CATEGORIES.map((c) => `${c.id}: ${c.name} (${c.group})`).join("\n");
}

function categoryOf(categoryId: string): Category {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown category: ${categoryId}`);
  return category;
}

export interface ParsedReceipt {
  store: string;
  items: LineItem[];
}

/**
 * Parses a grocery receipt photo via Claude's vision API, constrained to the
 * known category list so it can't invent a categoryId. Falls back to a
 * canned fixture on any failure (missing key, network, rate limit, bad
 * image type) so a live demo never hard-fails on a flaky connection.
 */
export async function parseReceipt(image: Buffer, mimeType: string): Promise<ParsedReceipt> {
  try {
    if (!isSupportedImageType(mimeType)) {
      throw new Error(`Unsupported image type: ${mimeType}`);
    }

    const client = getAnthropicClient();
    const response = await client.messages.parse({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system:
        "You read grocery receipt photos and extract every purchased line item. " +
        "Ignore subtotals, tax, totals, discounts, coupons, and loyalty-program info " +
        "when extracting line items. For each item, pick the single best-matching " +
        "category id from this list (never invent a new id):\n" +
        categoryContext() +
        "\n\nAlso estimate each item's nutrition for its full purchased quantity: " +
        "total calories (kcal), protein (g), carbohydrates (g), and fat (g). Base " +
        "these on the specific product you can identify from the photo (e.g. oat " +
        "milk vs. whole milk, or lean vs. regular ground beef, differ nutritionally " +
        "even under the same category) rather than a generic category average.\n\n" +
        'Separately, identify the store or retailer name from the receipt\'s header, ' +
        'logo, or footer text (e.g. "Kroger", "Trader Joe\'s"). If it is not legible ' +
        'or not present, return "Unknown store" rather than guessing.',
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: image.toString("base64") },
            },
            { type: "text", text: "Extract every purchased line item from this receipt." },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ParsedReceiptSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Claude did not return a parseable receipt");

    const items = parsed.items.map((item) => {
      const category = categoryOf(item.categoryId);
      // Claude's own mass estimate is often wildly off for low-confidence
      // items (it's frequently guessing at an item it couldn't read
      // clearly) — fall back to a standard portion/package size for the
      // category instead, and recompute kgCo2e/macros from that corrected
      // mass rather than keeping Claude's now-mismatched macro guess.
      const lowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;
      const massKg = lowConfidence ? category.typicalMassKg : round1(item.massKg);
      const macros = lowConfidence
        ? computeMacros(massKg, category)
        : {
            kcal: Math.round(item.kcal),
            proteinG: round1(item.proteinG),
            carbsG: round1(item.carbsG),
            fatG: round1(item.fatG),
          };
      return {
        id: makeId("item"),
        rawText: item.rawText,
        name: item.name,
        categoryId: item.categoryId,
        quantity: 1,
        massKg,
        kgCo2e: round1(massKg * category.kgCo2ePerKg),
        ...macros,
        confidence: item.confidence,
      };
    });

    return { store: parsed.store, items };
  } catch (error) {
    console.error("parseReceipt: falling back to canned items:", error);
    return { store: "Unknown store", items: cannedReceiptItems() };
  }
}
