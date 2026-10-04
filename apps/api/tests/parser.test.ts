import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/anthropicClient", () => ({
  getAnthropicClient: vi.fn(),
}));

import { getAnthropicClient } from "../src/lib/anthropicClient";
import { parseReceipt } from "../src/stubs/parser";

function mockClient(parse: (...args: unknown[]) => Promise<unknown>) {
  vi.mocked(getAnthropicClient).mockReturnValue({
    messages: { parse },
  } as unknown as ReturnType<typeof getAnthropicClient>);
}

describe("parseReceipt", () => {
  it("returns items derived from Claude's structured output on success", async () => {
    mockClient(async () => ({
      parsed_output: {
        items: [
          { rawText: "ORG AVOCADO", name: "Avocado", categoryId: "avocado", massKg: 0.3, confidence: 0.82 },
        ],
      },
    }));

    const items = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");

    expect(items).toHaveLength(1);
    expect(items[0].categoryId).toBe("avocado");
    expect(items[0].massKg).toBe(0.3);
    expect(items[0].kgCo2e).toBeCloseTo(0.3 * 2.3, 1); // avocado factor from categories.json
    expect(items[0].confidence).toBe(0.82);
  });

  it("falls back to the canned fixture when the API call throws", async () => {
    mockClient(async () => {
      throw new Error("network error");
    });

    const items = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");

    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.confidence < 0.7)).toBe(true); // known canned-fixture property
  });

  it("falls back to the canned fixture when Claude returns no parsed output", async () => {
    mockClient(async () => ({ parsed_output: null }));

    const items = await parseReceipt(Buffer.from("fake-image"), "image/jpeg");
    expect(items.length).toBeGreaterThan(0);
  });

  it("falls back to the canned fixture for an unsupported image type", async () => {
    mockClient(async () => {
      throw new Error("should not be called");
    });

    const items = await parseReceipt(Buffer.from("fake-image"), "application/pdf");
    expect(items.length).toBeGreaterThan(0);
  });
});
