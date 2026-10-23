import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const currentUser = vi.fn();
vi.mock("../session", () => ({ currentUser: () => currentUser() }));
vi.mock("next-intl/middleware", () => ({ default: () => () => new Response(null) }));

import middleware from "../../proxy";
import { isStorytimeHost, storytimeHostRedirect } from "../storytime/host";

/** Runs the proxy for a path on a host and returns the redirect target, or null when it does not redirect. */
async function redirectOf(host: string, path: string) {
  const response = await middleware(new NextRequest(`http://localhost:8080${path}`, { headers: { host } }));
  return response.headers.get("location");
}

describe("Storytime host rule (plan Q7)", () => {
  beforeEach(() => currentUser.mockReset().mockResolvedValue(null));

  it("serves the week pages on the Storytime host", async () => {
    for (const path of ["/th/st/2/1", "/st/2/1", "/en/st/2/1?part=song", "/th/st"]) {
      expect(await redirectOf("storytime.reading-advantage.com", path), path).toBeNull();
    }
  });

  it("sends every other page of the Storytime host to the same path on the Primary host", async () => {
    expect(await redirectOf("storytime.reading-advantage.com", "/th/auth/signin")).toBe("https://primary.reading-advantage.com/th/auth/signin");
    expect(await redirectOf("Storytime.Reading-Advantage.com:443", "/")).toBe("https://primary.reading-advantage.com/");
    expect(await redirectOf("storytime.reading-advantage.com", "/th/student/home?x=1")).toBe(
      "https://primary.reading-advantage.com/th/student/home?x=1",
    );
    expect(await redirectOf("storytime.reading-advantage.com", "/th/stories")).toBe("https://primary.reading-advantage.com/th/stories");
  });

  it("leaves the Primary host alone", async () => {
    expect(await redirectOf("primary.reading-advantage.com", "/th/about")).toBeNull();
    expect(storytimeHostRedirect(null, "/th/about")).toBeNull();
    expect(isStorytimeHost("primary.reading-advantage.com")).toBe(false);
  });
});
