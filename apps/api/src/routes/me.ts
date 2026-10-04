import { Router } from "express";
import { z } from "zod";
import { getState } from "../store";
import { parseOrThrow } from "../lib/validate";
import type { ProfileResponse } from "../domain/types";

const router = Router();

function buildProfile(): ProfileResponse {
  const { user, streak } = getState();
  return { ...user, streak };
}

router.get("/me", (_req, res) => {
  res.json(buildProfile());
});

const settingsSchema = z
  .object({
    units: z.enum(["metric", "imperial"]).optional(),
    notifications: z.boolean().optional(),
  })
  .strict();

router.patch("/me/settings", (req, res) => {
  const body = parseOrThrow(settingsSchema, req.body);
  const { user } = getState();
  user.settings = { ...user.settings, ...body };
  res.json(buildProfile());
});

export default router;
