import { makeId } from "../lib/ids";
import type { Category, LineItem } from "../domain/types";
import { round1 } from "../domain/scoring";
import categoriesData from "../data/categories.json";

const CATEGORIES = categoriesData as Category[];

function factorOf(categoryId: string): number {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  if (!category) throw new Error(`Unknown canned category: ${categoryId}`);
  return category.kgCo2ePerKg;
}

interface CannedItem {
  rawText: string;
  name: string;
  categoryId: string;
  quantity: number;
  massKg: number;
  confidence: number;
}

const CANNED_ITEMS: CannedItem[] = [
  { rawText: "BONELESS CHKN BRST", name: "Chicken breast", categoryId: "chicken", quantity: 1, massKg: 0.7, confidence: 0.91 },
  { rawText: "WHOLE WHEAT BREAD", name: "Bread", categoryId: "bread", quantity: 1, massKg: 0.5, confidence: 0.95 },
  { rawText: "ORG BANANAS", name: "Bananas", categoryId: "bananas", quantity: 1, massKg: 0.9, confidence: 0.64 },
  { rawText: "2% MILK GAL", name: "Milk", categoryId: "milk", quantity: 1, massKg: 1.9, confidence: 0.88 },
];

/**
 * Deterministic fixture used both as the real parser's fallback (network
 * error, rate limit, missing key) and as the test double in routes.test.ts.
 */
export function cannedReceiptItems(): LineItem[] {
  return CANNED_ITEMS.map((item) => ({
    id: makeId("item"),
    rawText: item.rawText,
    name: item.name,
    categoryId: item.categoryId,
    quantity: item.quantity,
    massKg: round1(item.massKg),
    kgCo2e: round1(item.massKg * factorOf(item.categoryId)),
    confidence: item.confidence,
  }));
}
