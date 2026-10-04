import { Router } from "express";
import { getState, getOpenWeek } from "../store";
import { fetchPatientRecords } from "../stubs/finchnode";
import { classifyHealthProfile, computeHealthRecommendations, type HealthProfile } from "../domain/health";
import type { HealthRecommendationsResponse } from "../domain/types";

const router = Router();

// The Finchnode sandbox patient is a static fixture and classification hits
// an LLM, so resolve it once per process rather than on every request —
// same spirit as the lazy Anthropic client singleton in lib/anthropicClient.ts.
let profilePromise: Promise<HealthProfile> | null = null;

function getHealthProfile(): Promise<HealthProfile> {
  if (!profilePromise) {
    profilePromise = fetchPatientRecords().then(classifyHealthProfile);
  }
  return profilePromise;
}

router.get("/health/recommendations", async (_req, res, next) => {
  try {
    const { dietFlags, allergyAlerts } = await getHealthProfile();

    const state = getState();
    const openWeek = getOpenWeek();
    const items = state.receipts
      .filter((r) => r.status === "confirmed" && r.weekId === openWeek.id)
      .flatMap((r) => r.items);

    const recommendations = computeHealthRecommendations(dietFlags, items, state.categories);

    const response: HealthRecommendationsResponse = { dietFlags, allergyAlerts, recommendations };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
