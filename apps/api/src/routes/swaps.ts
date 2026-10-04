import { Router } from "express";
import { getState } from "../store";
import { notFound } from "../lib/http-error";

const router = Router();

router.get("/swaps", (_req, res) => {
  const swaps = getState().swaps.slice().sort((a, b) => b.savingKg - a.savingKg);
  res.json(swaps);
});

router.post("/swaps/:id/commit", (req, res, next) => {
  const swap = getState().swaps.find((s) => s.id === req.params.id);
  if (!swap) return next(notFound(`Swap ${req.params.id} not found`));
  swap.committed = true;
  res.json(swap);
});

export default router;
