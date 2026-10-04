import { makeId } from "../lib/ids";
import type { OffsetQuote } from "../domain/types";

export interface PurchaseConfirmation {
  confirmationId: string;
  purchasedAt: string;
}

/**
 * Stub offset provider. Always "succeeds" with no real payment. Swap in a
 * real provider API later without touching the offsets route.
 */
export async function purchaseOffset(_quote: OffsetQuote): Promise<PurchaseConfirmation> {
  return {
    confirmationId: makeId("conf"),
    purchasedAt: new Date().toISOString(),
  };
}
