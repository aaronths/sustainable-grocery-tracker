import { ApiError, del, get, patch, post, postForm } from "./client";
import type {
  Category,
  CategoryStat,
  Challenge,
  DashboardResponse,
  League,
  Offset,
  OffsetHistoryResponse,
  OffsetQuote,
  ProfileResponse,
  Receipt,
  Swap,
  Week,
} from "./types";

export const getMe = (): Promise<ProfileResponse> => get("/me");

export const getDashboard = (): Promise<DashboardResponse> => get("/dashboard");

export const getWeeks = (limit = 12): Promise<Week[]> => get(`/weeks?limit=${limit}`);

export const getCategoryStats = (weeks = 12): Promise<CategoryStat[]> =>
  get(`/stats/categories?weeks=${weeks}`);

export const getSwaps = (): Promise<Swap[]> => get("/swaps");

export const commitSwap = (id: string): Promise<Swap> => post(`/swaps/${id}/commit`);

export async function getCurrentChallenge(): Promise<Challenge | null> {
  try {
    return await get<Challenge>("/challenges/current");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export const getLeagues = (): Promise<League[]> => get("/leagues");

export const getLeague = (id: string): Promise<League> => get(`/leagues/${id}`);

export const postOffsetQuote = (): Promise<OffsetQuote> => post("/offsets/quote");

export const postOffset = (quoteId: string): Promise<Offset> => post("/offsets", { quoteId });

export const getOffsets = (): Promise<OffsetHistoryResponse> => get("/offsets");

export const getReceipts = (): Promise<Receipt[]> => get("/receipts");

export const getReceipt = (id: string): Promise<Receipt> => get(`/receipts/${id}`);

export const uploadReceipt = (formData: FormData): Promise<{ id: string; status: string }> =>
  postForm("/receipts", formData);

export const patchReceiptItem = (
  receiptId: string,
  itemId: string,
  body: { categoryId?: string; quantity?: number },
): Promise<Receipt> => patch(`/receipts/${receiptId}/items/${itemId}`, body);

export const confirmReceipt = (id: string): Promise<DashboardResponse> =>
  post(`/receipts/${id}/confirm`);

export const deleteReceipt = (id: string): Promise<DashboardResponse> => del(`/receipts/${id}`);

export const getCategories = (): Promise<Category[]> => get("/categories");
