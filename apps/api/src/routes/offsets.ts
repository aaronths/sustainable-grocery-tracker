import { Router } from "express";
import { z } from "zod";
import { getOpenWeek, getState } from "../store";
import {
  computeLimit,
  computeOffsetQuote,
  DEFAULT_OFFSET_PRICE_PER_TONNE_CENTS,
  OFFSET_QUOTE_TTL_MS,
} from "../domain/scoring";
import { badRequest, notFound } from "../lib/http-error";
import { parseOrThrow } from "../lib/validate";
import { makeId } from "../lib/ids";
import { wrap } from "../lib/wrap";
import { purchaseOffset } from "../stubs/offsetProvider";
import type { Offset, OffsetHistoryResponse, OffsetQuote } from "../domain/types";

const router = Router();

router.post("/offsets/quote", (_req, res, next) => {
  const state = getState();
  const openWeek = getOpenWeek();
  const limit = computeLimit(state.streak.baselineKg);
  const calc = computeOffsetQuote(openWeek.totalKg, limit, DEFAULT_OFFSET_PRICE_PER_TONNE_CENTS);
  if (!calc) return next(badRequest("NOT_OVER_LIMIT", "This week is not over its limit"));

  const quote: OffsetQuote = {
    id: makeId("quote"),
    kg: calc.kg,
    costCents: calc.costCents,
    feeCents: calc.feeCents,
    totalCents: calc.totalCents,
    provider: "GreenGro Offsets",
    project: "Verified reforestation — Midwest",
    expiresAt: new Date(Date.now() + OFFSET_QUOTE_TTL_MS).toISOString(),
  };
  state.offsetQuotes.set(quote.id, quote);
  res.json(quote);
});

const purchaseSchema = z.object({ quoteId: z.string().min(1) }).strict();

router.post(
  "/offsets",
  wrap(async (req, res, next) => {
    const body = parseOrThrow(purchaseSchema, req.body);
    const state = getState();
    const quote = state.offsetQuotes.get(body.quoteId);
    if (!quote) return next(notFound(`Quote ${body.quoteId} not found`));
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      return next(badRequest("QUOTE_EXPIRED", "This quote has expired"));
    }

    await purchaseOffset(quote);

    const openWeek = getOpenWeek();
    const offset: Offset = {
      id: makeId("offset"),
      quoteId: quote.id,
      weekId: openWeek.id,
      kg: quote.kg,
      totalCents: quote.totalCents,
      createdAt: new Date().toISOString(),
    };
    state.offsets.push(offset);
    state.offsetQuotes.delete(quote.id);
    res.status(201).json(offset);
  }),
);

router.get("/offsets", (_req, res) => {
  const { offsets } = getState();
  const response: OffsetHistoryResponse = {
    offsets,
    totalKgOffset: Math.round(offsets.reduce((sum, o) => sum + o.kg, 0) * 10) / 10,
    totalCentsSpent: offsets.reduce((sum, o) => sum + o.totalCents, 0),
  };
  res.json(response);
});

export default router;
