// @vitest-environment node
/**
 * Owner decision 2026-10-05 (FR-8): the default locale is Thai. A visitor without a locale in the
 * path goes to /th, and the proxy sign-in redirects keep the locale of the path.
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ user: null as Record<string, unknown> | null }));
vi.mock("@/lib/session", () => ({ currentUser: async () => mocks.user }));

import { routing } from "@/i18n/routing";
import middleware, { config } from "../../proxy";

/**
 * Runs the proxy for a path.
 * @param path The request path.
 * @returns The redirect target path with its query, or null when the proxy does not redirect.
 */
async function redirectOf(path: string) {
  const response = await middleware(new NextRequest(new URL(path, "http://localhost")));
  const location = response.headers.get("location");
  return location ? new URL(location, "http://localhost").pathname + new URL(location, "http://localhost").search : null;
}

beforeEach(() => {
  mocks.user = null;
});

describe("default locale (owner decision 2026-10-05)", () => {
  it("is Thai, and the locale list is unchanged", () => {
    expect(routing.defaultLocale).toBe("th");
    expect(routing.locales).toEqual(["en", "th", "vi", "cn", "tw"]);
  });

  it("sends a visitor without a locale in the path to /th", async () => {
    expect(await redirectOf("/")).toBe("/th");
  });

  it("keeps the path locale when a signed-out visitor opens a teacher page", async () => {
    expect(await redirectOf("/th/teacher/dashboard")).toBe(`/th/auth/signin?callbackUrl=${encodeURIComponent("/th/teacher/dashboard")}`);
    expect(await redirectOf("/en/teacher/dashboard")).toBe(`/en/auth/signin?callbackUrl=${encodeURIComponent("/en/teacher/dashboard")}`);
  });

  it("sends a signed-in teacher from sign-in to the teacher dashboard in the same locale", async () => {
    mocks.user = { id: "t1", role: "TEACHER", schoolId: "school-1" };
    expect(await redirectOf("/th/auth/signin")).toBe("/th/teacher/dashboard");
  });
});

describe("printed book URL without a locale (QR path)", () => {
  it("redirects once to a locale path and keeps the path and the query", async () => {
    expect(await redirectOf("/b/o3-2/5")).toBe("/th/b/o3-2/5");
    expect(await redirectOf("/b/o3-2/5/writing")).toBe("/th/b/o3-2/5/writing");
    expect(await redirectOf("/b/o3-2/5?utm=qr")).toBe("/th/b/o3-2/5?utm=qr");
  });

  it("gives no redirect for a locale path", async () => {
    expect(await redirectOf("/th/b/o3-2/5")).toBeNull();
    expect(await redirectOf("/en/b/o3-2/5/writing")).toBeNull();
  });

  it("matches the five book keys in the proxy matcher", () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    for (const key of ["o1", "o2", "o3-1", "o3-2", "q4"]) {
      expect(matcher.test(`/b/${key}/5`)).toBe(true);
      expect(matcher.test(`/b/${key}/5/writing`)).toBe(true);
    }
  });

  it("does not send a signed-out reader to sign-in", async () => {
    for (const path of ["/b/o3-2/5", "/b/o3-2/5/writing", "/th/b/o3-2/5", "/en/b/q4/1/writing"]) {
      expect((await redirectOf(path)) ?? "").not.toContain("/auth/signin");
    }
  });
});
