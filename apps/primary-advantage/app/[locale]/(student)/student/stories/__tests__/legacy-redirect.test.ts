/** Legacy story URLs (`/student/stories/...`) redirect to the new Read pages (spec S7). */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveLegacyStoryId: vi.fn(),
  user: { id: "s1", role: "STUDENT", schoolId: "sc1" } as Record<string, unknown> | null,
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain", () => ({ createTenantDB: vi.fn(() => ({})) }));
vi.mock("@reading-advantage/domain/stories", () => ({
  resolveLegacyStoryId: mocks.resolveLegacyStoryId,
  resolveLegacyChapter: (text: string) => (/^[1-9][0-9]*$/u.test(text) ? Number(text) : null),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));

import LegacyStoriesPage from "../[[...path]]/page";
import { redirect } from "@/i18n/navigation";

const UUID = "f52e7c27-7030-459a-859a-c3a28a4accbd";
const CUID = "cmgqx8v6602p3t79btatvfjuw";
const run = (path?: string[]) => LegacyStoriesPage({ params: Promise.resolve({ locale: "th", path }) });

describe("legacy story redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: "s1", role: "STUDENT", schoolId: "sc1" };
  });

  it("sends the list URL to the Read Stories tab", async () => {
    await run(undefined);
    expect(redirect).toHaveBeenCalledWith({ href: "/student/read/stories", locale: "th" });
  });

  it("sends a known cuid to the new story page", async () => {
    mocks.resolveLegacyStoryId.mockResolvedValue(UUID);
    await run([CUID]);
    expect(redirect).toHaveBeenCalledWith({ href: `/student/read/stories/${UUID}`, locale: "th" });
  });

  it("sends a chapter URL to the new chapter page", async () => {
    mocks.resolveLegacyStoryId.mockResolvedValue(UUID);
    await run([CUID, "2"]);
    expect(redirect).toHaveBeenCalledWith({ href: `/student/read/stories/${UUID}/2`, locale: "th" });
  });

  it("passes a uuid through without a lookup", async () => {
    await run([UUID, "1"]);
    expect(mocks.resolveLegacyStoryId).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith({ href: `/student/read/stories/${UUID}/1`, locale: "th" });
  });

  it("returns 404 for an unknown cuid", async () => {
    mocks.resolveLegacyStoryId.mockResolvedValue(null);
    await expect(run([CUID])).rejects.toThrow("NEXT_NOT_FOUND");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns 404 for a bad chapter number or a long path", async () => {
    mocks.resolveLegacyStoryId.mockResolvedValue(UUID);
    await expect(run([CUID, "abc"])).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(run([CUID, "1", "x"])).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends a signed-out visitor to sign in", async () => {
    mocks.user = null;
    await run([CUID]);
    expect(redirect).toHaveBeenCalledWith({ href: "/auth/signin", locale: "th" });
  });
});
