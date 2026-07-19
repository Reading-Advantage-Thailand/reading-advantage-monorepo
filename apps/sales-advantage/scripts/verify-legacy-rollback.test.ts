// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { verifyLegacyRollback } from "./verify-legacy-rollback";

const appRoot = resolve(import.meta.dirname, "..");
const verifier = readFileSync(
  resolve(appRoot, "scripts/verify-legacy-rollback.ts"),
  "utf8",
);
const setup = readFileSync(
  resolve(appRoot, "scripts/sales-legacy-rollback-session-setup.sql"),
  "utf8",
);
const cleanup = readFileSync(
  resolve(appRoot, "scripts/sales-legacy-rollback-session-cleanup.sql"),
  "utf8",
);
const accountId = "00000000-0000-4000-8000-000000000001";
const repairManifestJson = JSON.stringify({
  accountId,
  expectedCurrentRole: "SALES_ADMIN",
  targetRole: "ADMIN",
});

/**
 * Creates the four release responses with a caller-selected session principal.
 * @param user Session user returned by the tagged revision.
 * @returns A deterministic fetch implementation for rollback behavior tests.
 */
function releaseFetch(user: { readonly id: string; readonly role: string }) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({ status: "alive", service: "sales-advantage" }),
    )
    .mockResolvedValueOnce(
      Response.json({
        status: "ready",
        service: "sales-advantage",
        mode: "legacy-school",
        dependencies: { database: "ready", accounts: "not-required" },
      }),
    )
    .mockResolvedValueOnce(Response.json({ session: { user } }))
    .mockResolvedValueOnce(Response.json({ result: { data: {} } }));
}

describe("Sales legacy rollback verification contract", () => {
  it("executes manifest-bound session and protected-access checks", async () => {
    const sessionToken = "a".repeat(64);
    const fetchImplementation = releaseFetch({
      id: `sales:${accountId}`,
      role: "SALES_ADMIN",
    });

    const result = await verifyLegacyRollback(
      {
        baseUrl: "https://legacy-rollback---sales.example.test",
        sessionToken,
        repairManifestJson,
      },
      fetchImplementation,
    );

    expect(result.checks).toEqual([
      "health",
      "readiness",
      "session",
      "protected-access",
    ]);
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    expect(
      fetchImplementation.mock.calls.map(
        ([url]) => new URL(String(url)).pathname,
      ),
    ).toEqual([
      "/api/health",
      "/api/ready",
      "/api/auth/session",
      "/api/trpc/sales.dashboard",
    ]);
    expect(fetchImplementation.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: `session_token=${sessionToken}`,
        }),
      }),
    );
    expect(verifier).not.toMatch(/password/i);
  });

  it("rejects a failed readiness dependency before authenticated checks", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ status: "alive", service: "sales-advantage" }),
      )
      .mockResolvedValueOnce(
        Response.json({ status: "unavailable" }, { status: 503 }),
      );

    await expect(
      verifyLegacyRollback(
        {
          baseUrl: "https://legacy-rollback---sales.example.test",
          sessionToken: "b".repeat(64),
          repairManifestJson,
        },
        fetchImplementation,
      ),
    ).rejects.toThrow("/api/ready returned HTTP 503");
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "another valid Sales user",
      {
        id: "sales:00000000-0000-4000-8000-000000000002",
        role: "SALES_ADMIN",
      },
    ],
    [
      "another valid Sales role",
      { id: `sales:${accountId}`, role: "SALES_REP" },
    ],
  ])("rejects %s returned by the disposable session", async (_label, user) => {
    const fetchImplementation = releaseFetch(user);

    await expect(
      verifyLegacyRollback(
        {
          baseUrl: "https://legacy-rollback---sales.example.test",
          sessionToken: "c".repeat(64),
          repairManifestJson,
        },
        fetchImplementation,
      ),
    ).rejects.toThrow();
    expect(fetchImplementation).toHaveBeenCalledTimes(3);
  });

  it("binds the disposable session to pre-repair or audited post-repair mappings", () => {
    expect(setup).toContain("repair_manifest");
    expect(setup).toContain("expectedCurrentRole");
    expect(setup).toContain("targetRole");
    expect(setup).toContain("observed_role = target_role");
    expect(setup).toContain("sales:legacy_source_role_repaired");
    expect(setup).toContain("completed_audit_count <> 1");
    expect(setup).toContain("observed_role IS DISTINCT FROM expected_role");
    expect(setup).toContain("company_product_principals");
    expect(setup).toContain("mapping_count <> 1");
    expect(setup).toContain("INSERT INTO sessions");
    expect(setup).toContain("now() + interval '5 minutes'");
    expect(setup).not.toContain("password");
    expect(cleanup).toContain("DELETE FROM sessions");
    expect(cleanup).toContain(":'probe_session_id'");
    expect(cleanup).toContain(
      "user_agent = 'cloud-build-sales-legacy-rollback-probe'",
    );
    expect(cleanup).toContain("Sales rollback probe cleanup failed");
  });
});
