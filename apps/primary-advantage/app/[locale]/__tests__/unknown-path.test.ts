import { describe, expect, it, vi } from "vitest";

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));
vi.mock("next/navigation", () => ({ notFound }));

describe("unknown path under a locale (manual test P5)", () => {
  it("calls notFound, so the answer has status 404, not 200", async () => {
    const { default: UnknownPath } = await import("../[...not-found]/page");
    expect(() => UnknownPath()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
