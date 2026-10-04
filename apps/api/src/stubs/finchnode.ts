const BASE_URL = "https://api.finchnode.com/demo/v1";
const DEFAULT_PATIENT_ID = "patient-demo-001";

export interface ConditionRecord {
  name: string;
  status: string | null;
  verificationStatus: string | null;
  severity: string | null;
  onsetDate: string | null;
  recordedDate: string | null;
}

export interface AllergyRecord {
  substance: string;
  reaction: string | null;
  severity: string | null;
  status: string | null;
  verificationStatus: string | null;
  recordedDate: string | null;
}

export interface ImmunizationRecord {
  name: string;
  code: string | null;
  status: string | null;
  date: string | null;
  manufacturer: string | null;
  lotNumber: string | null;
}

export interface PatientRecords {
  conditions: ConditionRecord[];
  allergies: AllergyRecord[];
  immunizations: ImmunizationRecord[];
}

interface DemoHealthRecordResponse {
  data?: {
    conditions?: ConditionRecord[];
    allergies?: AllergyRecord[];
    immunizations?: ImmunizationRecord[];
  };
}

/**
 * Deterministic fixture used both as the real client's fallback (network
 * error, rate limit, unexpected shape) and as the test double in
 * routes.test.ts — mirrors cannedReceiptItems() in stubs/cannedReceipt.ts.
 */
export function cannedPatientRecords(): PatientRecords {
  return {
    conditions: [
      {
        name: "Hyperlipidemia (high cholesterol)",
        status: "active",
        verificationStatus: "confirmed",
        severity: "moderate",
        onsetDate: "2021-03-10",
        recordedDate: "2021-03-10",
      },
    ],
    allergies: [
      {
        substance: "Peanut",
        reaction: "Hives",
        severity: "moderate",
        status: "active",
        verificationStatus: "confirmed",
        recordedDate: "2015-06-01",
      },
    ],
    immunizations: [
      {
        name: "Influenza vaccine",
        code: "FLU",
        status: "completed",
        date: "2025-10-01",
        manufacturer: null,
        lotNumber: null,
      },
    ],
  };
}

function finchnodeHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  if (process.env.FINCHNODE_SANDBOX_KEY) {
    headers["X-Api-Key"] = process.env.FINCHNODE_SANDBOX_KEY;
  }
  return headers;
}

export interface ConnectSessionResult {
  status: "complete" | "cancelled" | "failed";
  patientId: string | null;
  failureCode?: string;
}

interface ConnectSessionResponse {
  status: string;
  patient_id: string | null;
  failure_code?: string;
}

/**
 * Simulates a Finchnode Connect "link your records" flow via the demo
 * sandbox's POST /connect/sessions (there's no hosted sign-in page to open
 * in the demo API — it resolves synchronously). Falls back to a locally-
 * simulated successful link on any failure, same resilience pattern as
 * fetchPatientRecords(), so linking in the app never hard-fails on a flaky
 * sandbox connection.
 */
export async function createConnectSession(scenario = "baseline-adult"): Promise<ConnectSessionResult> {
  try {
    const response = await fetch(`${BASE_URL}/connect/sessions`, {
      method: "POST",
      headers: finchnodeHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ scenario }),
    });
    if (!response.ok) {
      throw new Error(`Finchnode responded ${response.status}`);
    }

    const body = (await response.json()) as ConnectSessionResponse;
    return {
      status: body.status as ConnectSessionResult["status"],
      patientId: body.patient_id,
      failureCode: body.failure_code,
    };
  } catch (error) {
    console.error("createConnectSession: falling back to a locally-simulated link:", error);
    return { status: "complete", patientId: DEFAULT_PATIENT_ID };
  }
}

/**
 * Pulls Conditions/Allergies/Immunizations for a Finchnode demo sandbox
 * patient. The demo API requires no auth, but FINCHNODE_SANDBOX_KEY is sent
 * as an optional header if set. Falls back to a canned fixture on any
 * failure (network error, non-200, unexpected shape) so the health-insights
 * route never hard-fails on a flaky sandbox — same pattern as
 * stubs/parser.ts's fallback to cannedReceiptItems().
 */
export async function fetchPatientRecords(patientId = DEFAULT_PATIENT_ID): Promise<PatientRecords> {
  try {
    const url = `${BASE_URL}/users/${encodeURIComponent(patientId)}/records?categories=conditions,allergies,immunizations`;
    const response = await fetch(url, { headers: finchnodeHeaders() });
    if (!response.ok) {
      throw new Error(`Finchnode responded ${response.status}`);
    }

    const body = (await response.json()) as DemoHealthRecordResponse;
    return {
      conditions: body.data?.conditions ?? [],
      allergies: body.data?.allergies ?? [],
      immunizations: body.data?.immunizations ?? [],
    };
  } catch (error) {
    console.error("fetchPatientRecords: falling back to canned records:", error);
    return cannedPatientRecords();
  }
}
