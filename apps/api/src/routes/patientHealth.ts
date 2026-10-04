import { Router } from "express";
import { getState, getOpenWeek } from "../store";
import { createConnectSession, fetchPatientRecords } from "../stubs/finchnode";
import { classifyHealthProfile, computeHealthRecommendations, type HealthProfile } from "../domain/health";
import type { HealthLinkResponse, HealthRecommendationsResponse } from "../domain/types";

const router = Router();

// A patient's Finchnode fixture is static and classification hits an LLM, so
// resolve each patient id once per process rather than on every request —
// same spirit as the lazy Anthropic client singleton in lib/anthropicClient.ts.
const profileCache = new Map<string, Promise<HealthProfile>>();

function getHealthProfile(patientId: string): Promise<HealthProfile> {
  let cached = profileCache.get(patientId);
  if (!cached) {
    cached = fetchPatientRecords(patientId).then(classifyHealthProfile);
    profileCache.set(patientId, cached);
  }
  return cached;
}

router.post("/health/link", async (_req, res, next) => {
  try {
    const result = await createConnectSession();
    const state = getState();
    if (result.status === "complete" && result.patientId) {
      state.linkedPatientId = result.patientId;
    }

    const response: HealthLinkResponse = {
      linked: state.linkedPatientId !== null,
      patientId: state.linkedPatientId,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/health/recommendations", async (_req, res, next) => {
  try {
    const state = getState();

    if (!state.linkedPatientId) {
      const response: HealthRecommendationsResponse = {
        linked: false,
        dietFlags: [],
        allergyAlerts: [],
        recommendations: [],
      };
      return res.json(response);
    }

    const { dietFlags, allergyAlerts } = await getHealthProfile(state.linkedPatientId);

    const openWeek = getOpenWeek();
    const items = state.receipts
      .filter((r) => r.status === "confirmed" && r.weekId === openWeek.id)
      .flatMap((r) => r.items);

    const recommendations = computeHealthRecommendations(dietFlags, items, state.categories);

    const response: HealthRecommendationsResponse = {
      linked: true,
      dietFlags,
      allergyAlerts,
      recommendations,
    };
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
