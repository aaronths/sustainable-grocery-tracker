// zodOutputFormat() builds its JSON schema from zod/v4 internals specifically
// (not the classic v3 API the rest of this app's routes use for validation),
// so this schema is built against that subpath.
import { z } from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient } from "../lib/anthropicClient";
import { makeId } from "../lib/ids";
import { round1 } from "../domain/scoring";
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
  confidence: z.number().min(0).max(1).describe("Self-assessed confidence in the category match, 0 to 1"),
});

const ParsedReceiptSchema = z.object({
  items: z.array(ParsedLineItemSchema),
});

function categoryContext(): string {
  return CATEGORIES.map((c) => `${c.id}: ${c.name} (${c.group})`).join("\n");
}

function factorOf(categoryId: string): number {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown category: ${categoryId}`);
  return category.kgCo2ePerKg;
}

/**
 * Parses a grocery receipt photo via Claude's vision API, constrained to the
 * known category list so it can't invent a categoryId. Falls back to a
 * canned fixture on any failure (missing key, network, rate limit, bad
 * image type) so a live demo never hard-fails on a flaky connection.
 */
export async function parseReceipt(image: Buffer, mimeType: string): Promise<LineItem[]> {
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
        "Ignore subtotals, tax, totals, discounts, coupons, and store/loyalty info. " +
        "For each item, pick the single best-matching category id from this list " +
        "(never invent a new id):\n" +
        categoryContext(),
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

    return parsed.items.map((item) => {
      const massKg = round1(item.massKg);
      return {
        id: makeId("item"),
        rawText: item.rawText,
        name: item.name,
        categoryId: item.categoryId,
        quantity: 1,
        massKg,
        kgCo2e: round1(massKg * factorOf(item.categoryId)),
        confidence: item.confidence,
      };
    });
  } catch (error) {
    console.error("parseReceipt: falling back to canned items:", error);
    return cannedReceiptItems();
  }
}
