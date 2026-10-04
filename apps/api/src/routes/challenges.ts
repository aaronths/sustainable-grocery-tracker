import { Router } from "express";
import { z } from "zod";
import { getState } from "../store";
import { notFound } from "../lib/http-error";
import { parseOrThrow } from "../lib/validate";

const router = Router();

router.get("/challenges/current", (_req, res, next) => {
  const [challenge] = getState().challenges;
  if (!challenge) return next(notFound("No active challenge"));
  res.json(challenge);
});

const progressSchema = z.object({ amount: z.number().positive().optional() }).strict();

router.post("/challenges/:id/progress", (req, res, next) => {
  const challenge = getState().challenges.find((c) => c.id === req.params.id);
  if (!challenge) return next(notFound(`Challenge ${req.params.id} not found`));
  const body = parseOrThrow(progressSchema, req.body ?? {});
  challenge.progress = Math.min(challenge.target, challenge.progress + (body.amount ?? 1));
  res.json(challenge);
});

export default router;
