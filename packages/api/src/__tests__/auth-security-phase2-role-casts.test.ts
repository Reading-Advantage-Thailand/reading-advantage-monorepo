/**
 * Phase 2 Red-phase contract for Task 17: derive audit-context role from
 * typed `Role` instead of casting.
 *
 * Driven by `measure/tracks/post_24h_audit_remediation_20260612/plan.md`
 * Phase 2 Task 17.
 *
 * The login handler currently passes `user.role as Role` to `recordAuditEvent`.
 * The user row is already typed by the DB query, so the cast is unnecessary
 * and masks the type contract. This test pins the cleanup.
 *
 * RED expectations (this commit):
 *   - `packages/api/src/routes/auth/login.ts` still contains `user.role as Role`
 *     → the source contract assertion fails.
 *
 * GREEN expectations (next role owns the fix):
 *   - Remove the `as Role` casts in login.ts audit context.
 *   - Derive the audit role from the typed user object (e.g., by selecting
 *     `users.role` with a Role type or by letting the typed schema flow through).
 *   - Live gate: `pnpm --filter @reading-advantage/api check-types` must pass.
 *
 * Test command (no DB / no network):
 *   pnpm --filter @reading-advantage/api vitest run src/__tests__/auth-security-phase2-role-casts.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, "..", "..");
const LOGIN_TS_PATH = resolve(PACKAGE_ROOT, "src", "routes", "auth", "login.ts");

describe("Phase 2 Task 17 — audit-context role is typed, not cast", () => {
  it("login.ts does not cast user.role to Role for audit context", () => {
    const source = readFileSync(LOGIN_TS_PATH, "utf-8");

    expect(
      source,
      "login.ts must not contain `user.role as Role` casts. " +
        "The audit context should derive the role from a typed source " +
        "(e.g., selecting users.role as Role or relying on the typed schema).",
    ).not.toMatch(/user\.role\s+as\s+Role/);
  });
});
