// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildSignInHref } from "../sign-in-href";

describe("Accounting sign-in href", () => {
  it("builds the start href with an encoded returnTo for a safe path", () => {
    expect(buildSignInHref("/expenses", "?tab=open")).toBe(
      "/api/auth/company/start?returnTo=%2Fexpenses%3Ftab%3Dopen",
    );
  });

  it("falls back to / for a non-safe path", () => {
    expect(buildSignInHref("//evil.example.com", "")).toBe(
      "/api/auth/company/start?returnTo=%2F",
    );
  });

  it("falls back to / when the query carries a fragment", () => {
    expect(buildSignInHref("/expenses", "?x#frag")).toBe(
      "/api/auth/company/start?returnTo=%2F",
    );
  });
});
