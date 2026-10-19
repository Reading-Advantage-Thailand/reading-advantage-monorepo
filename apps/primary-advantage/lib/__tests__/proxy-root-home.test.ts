import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const currentUser = vi.fn();
vi.mock("../session", () => ({ currentUser: () => currentUser() }));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null) }));

import middleware from "../../proxy";

/** Runs the proxy for a path and returns the redirect target path, or null when it does not redirect. */
async function redirectOf(path: string) {
  const response = await middleware(new NextRequest(`http://localhost:3000${path}`));
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("proxy bare locale root (manual test M1)", () => {
  beforeEach(() => currentUser.mockReset());

  it.each([
    ["STUDENT", "/en", "/en/student/home"],
    ["TEACHER", "/th", "/th/teacher/dashboard"],
    ["ADMIN", "/en/", "/en/admin/dashboard"],
    ["SYSTEM", "/en", "/en/system/dashboard"],
  ])("sends a signed-in %s from %s to the role home", async (role, path, target) => {
    currentUser.mockResolvedValue({ id: "u1", role });
    expect(await redirectOf(path)).toBe(target);
  });

  it("keeps a signed-out visitor on the public home page", async () => {
    currentUser.mockResolvedValue(null);
    expect(await redirectOf("/en")).toBeNull();
  });

  it("keeps a role with no home on the public home page", async () => {
    currentUser.mockResolvedValue({ id: "u1", role: "SALES" });
    expect(await redirectOf("/en")).toBeNull();
  });

  it("leaves other public pages alone", async () => {
    currentUser.mockResolvedValue({ id: "u1", role: "STUDENT" });
    expect(await redirectOf("/en/about")).toBeNull();
  });
});
