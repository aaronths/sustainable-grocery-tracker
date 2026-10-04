import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { findReceipt, getOpenWeek, getState, recomputeOpenWeekTotal } from "../store";
import { makeId } from "../lib/ids";
import { badRequest, notFound } from "../lib/http-error";
import { parseOrThrow } from "../lib/validate";
import { round1 } from "../domain/scoring";
import { parseReceipt } from "../stubs/parser";
import { buildDashboard } from "../lib/dashboard";
import type { Receipt } from "../domain/types";

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.post("/receipts", upload.single("image"), (req, res, next) => {
  if (!req.file) return next(badRequest("MISSING_IMAGE", "An image file is required"));

  const state = getState();
  const openWeek = getOpenWeek();
  const receipt: Receipt = {
    id: makeId("rcpt"),
    weekId: openWeek.id,
    store: "Unknown store",
    uploadedAt: new Date().toISOString(),
    status: "processing",
    items: [],
  };
  state.receipts.push(receipt);

  const imageBuffer = req.file.buffer;
  const mimeType = req.file.mimetype;
  setTimeout(() => {
    parseReceipt(imageBuffer, mimeType)
      .then((items) => {
        const current = findReceipt(receipt.id);
        if (!current || current.status !== "processing") return;
        current.items = items;
        current.status = "ready";
      })
      .catch(() => {
        const current = findReceipt(receipt.id);
        if (current && current.status === "processing") current.status = "ready";
      });
  }, 1500);

  res.status(202).json({ id: receipt.id, status: receipt.status });
});

router.get("/receipts", (req, res) => {
  const { weekId } = req.query;
  const receipts = getState().receipts.filter((r) =>
    typeof weekId === "string" ? r.weekId === weekId : true,
  );
  res.json(receipts);
});

router.get("/receipts/:id", (req, res, next) => {
  const receipt = findReceipt(req.params.id);
  if (!receipt) return next(notFound(`Receipt ${req.params.id} not found`));
  res.json(receipt);
});

const patchItemSchema = z
  .object({
    categoryId: z.string().min(1).optional(),
    quantity: z.number().positive().optional(),
  })
  .strict();

router.patch("/receipts/:id/items/:itemId", (req, res, next) => {
  const receipt = findReceipt(req.params.id);
  if (!receipt) return next(notFound(`Receipt ${req.params.id} not found`));
  const item = receipt.items.find((i) => i.id === req.params.itemId);
  if (!item) return next(notFound(`Item ${req.params.itemId} not found`));

  const body = parseOrThrow(patchItemSchema, req.body);
  const state = getState();

  if (body.categoryId) {
    const category = state.categories.find((c) => c.id === body.categoryId);
    if (!category) return next(badRequest("UNKNOWN_CATEGORY", `Unknown category ${body.categoryId}`));
    item.categoryId = category.id;
  }
  if (body.quantity !== undefined) {
    const unitMassKg = item.massKg / item.quantity;
    item.quantity = body.quantity;
    item.massKg = round1(unitMassKg * body.quantity);
  }

  const category = state.categories.find((c) => c.id === item.categoryId)!;
  item.kgCo2e = round1(item.massKg * category.kgCo2ePerKg);
  item.confidence = 1;

  if (receipt.status === "confirmed") recomputeOpenWeekTotal();

  res.json(receipt);
});

router.post("/receipts/:id/confirm", (req, res, next) => {
  const receipt = findReceipt(req.params.id);
  if (!receipt) return next(notFound(`Receipt ${req.params.id} not found`));
  if (receipt.status === "processing") {
    return next(badRequest("RECEIPT_NOT_READY", "Receipt is still processing"));
  }
  receipt.status = "confirmed";
  recomputeOpenWeekTotal();
  res.json(buildDashboard());
});

router.delete("/receipts/:id", (req, res, next) => {
  const state = getState();
  const receipt = findReceipt(req.params.id);
  if (!receipt) return next(notFound(`Receipt ${req.params.id} not found`));
  state.receipts = state.receipts.filter((r) => r.id !== receipt.id);
  recomputeOpenWeekTotal();
  res.json(buildDashboard());
});

export default router;
