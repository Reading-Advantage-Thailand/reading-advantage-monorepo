// @vitest-environment node
import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/middleware", () => ({
  default: () => () => NextResponse.next(),
}));

import { proxy } from "../proxy";

function protectedRequest(
  cookie?: string,
  pathname = "/en/admin",
): NextRequest {
  return new NextRequest(`https://sales.reading-advantage.com${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("Sales browser proxy auth mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SALES_AUTH_MODE = "company";
  });

  it("uses only the company application cookie in company mode", async () => {
    await expect(
      proxy(protectedRequest("__Host-ra_sales_session=company-token")),
    ).resolves.toMatchObject({ status: 200 });
    const rejected = await proxy(
      protectedRequest("session_token=legacy-token"),
    );
    expect(rejected.status).toBe(307);
  });

  it("uses the legacy session cookie for protected admin routes in rollback mode", async () => {
    process.env.SALES_AUTH_MODE = "legacy-school";

    const accepted = await proxy(
      protectedRequest("session_token=legacy-token"),
    );
    expect(accepted.status).toBe(200);
    await expect(
      proxy(
        protectedRequest("session_token=legacy-token", "/en/module/onboarding"),
      ),
    ).resolves.toMatchObject({ status: 200 });
    await expect(
      proxy(
        protectedRequest("session_token=legacy-token", "/en/lesson/lesson-1"),
      ),
    ).resolves.toMatchObject({ status: 200 });
    const rejected = await proxy(
      protectedRequest("__Host-ra_sales_session=company-token"),
    );
    expect(rejected.status).toBe(307);
  });
});
