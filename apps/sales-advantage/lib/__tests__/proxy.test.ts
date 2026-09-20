// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));

import { proxy, config } from "../../proxy";

function createRequest(
  pathname: string,
  cookie?: string,
  headers?: HeadersInit,
): NextRequest {
  return new NextRequest(
    `https://sales.reading-advantage.com${pathname}`,
    { headers: cookie ? { ...(headers ?? {}), cookie } : headers },
  );
}

describe("Sales browser proxy SSO redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALES_AUTH_MODE = "company";
  });

  afterEach(() => {
    delete process.env.SALES_AUTH_MODE;
  });

  it("uses only the company application cookie in company mode", async () => {
    const accepted = await proxy(
      createRequest("/en/admin", "__Host-ra_sales_session=company-token"),
    );
    expect(accepted.status).toBe(200);

    const rejected = await proxy(
      createRequest("/en/admin", "session_token=legacy-token"),
    );
    expect(rejected.status).toBe(307);
  });

  it("redirects an unauthenticated protected request to the company start route", async () => {
    const response = await proxy(createRequest("/th/module/1"));
    const location = new URL(response.headers.get("location")!);

    expect(response.status).toBe(307);
    expect(location.pathname).toBe("/api/auth/company/start");
    expect(location.searchParams.get("returnTo")).toBe("/th/module/1");
  });

  it("never carries a redirectTo query parameter", async () => {
    const response = await proxy(
      createRequest("/en/module/onboarding", undefined, {
        "x-forwarded-host": "sales.reading-advantage.com",
        "x-forwarded-proto": "https",
      }),
    );

    expect(response.headers.get("location")).not.toContain("redirectTo");
  });

  it("reaches /en/ without setting NEXT_LOCALE for an English cookie holder", async () => {
    const response = await proxy(
      createRequest("/", "NEXT_LOCALE=en"),
    );
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toMatch(/^\/en\/?$/);
    expect(response.headers.get("set-cookie") ?? "").not.toContain(
      "NEXT_LOCALE=",
    );
  });

  it("reaches /th/ and sets NEXT_LOCALE=th for a cookieless visitor", async () => {
    const response = await proxy(createRequest("/"));
    const location = new URL(response.headers.get("location")!);

    expect(location.pathname).toMatch(/^\/th\/?$/);
    expect(response.headers.get("set-cookie") ?? "").toContain("NEXT_LOCALE=th");
  });

  it("gates protected paths with the legacy cookie in legacy-school mode", async () => {
    process.env.SALES_AUTH_MODE = "legacy-school";

    const accepted = await proxy(
      createRequest("/en/admin", "session_token=legacy-token"),
    );
    expect(accepted.status).toBe(200);
    await expect(
      proxy(
        createRequest("/en/module/onboarding", "session_token=legacy-token"),
      ),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      proxy(createRequest("/en/lesson/lesson-1", "session_token=legacy-token")),
    ).resolves.toMatchObject({ status: 200 });

    const rejected = await proxy(
      createRequest("/en/admin", "__Host-ra_sales_session=company-token"),
    );
    expect(rejected.status).toBe(307);
  });

  it("keeps the protected-path regex unchanged", async () => {
    const protectedWithoutSession = await proxy(createRequest("/EN/Admin"));
    expect(protectedWithoutSession.status).toBe(307);

    const lessonWithoutSession = await proxy(createRequest("/lesson/1"));
    expect(lessonWithoutSession.status).toBe(307);

    const unprotected = await proxy(createRequest("/th/dashboard"));
    expect(unprotected.status).toBe(200);
  });

  it("exports a matcher config", () => {
    expect(config.matcher).toBeDefined();
    expect(Array.isArray(config.matcher)).toBe(true);
    expect(config.matcher[0]).toContain("api");
    expect(config.matcher[0]).toContain("\\.");
  });
});
