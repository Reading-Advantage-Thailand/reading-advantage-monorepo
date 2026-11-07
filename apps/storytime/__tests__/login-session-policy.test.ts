/**
 * The session policy (AC-4.4, test strategy P2b.7, task 2b.2).
 *
 * `lib/auth/session-policy.ts` exports the pinned constants (`SESSION_MAX_AGE_S`,
 * `RENEW_BELOW_DAYS`, `CAP_CLASS`, `CAP_FAMILY`, `CAP_TEACHER`, `MEDIA_URL_EXPIRES_S`) and the
 * pure decisions `sessionCapForRole`, `isSessionActive`, `shouldRenew`, `renewalExpiry`, and
 * `planRenewal`. Renewal writes at most once each day.
 *
 * The same file registers the shared store contract suite against the fake store (P2b.5). The
 * suite is registered only when the policy module exists, so the base run holds one failing case
 * and no passing one. Every red case starts with the pinned path check.
 *
 * At the base the first assertion fails on `Missing apps/storytime/lib/auth/session-policy.ts`.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { storeContractSuite } from "../../../packages/backend/src/modules/storytime-access/__tests__/store-contract";
import { createFakeStore, fakeStoreState } from "./helpers/fake-store";

const APP = resolve(import.meta.dirname, "..");
const POLICY = resolve(APP, "lib/auth/session-policy.ts");
const MISSING = "Missing apps/storytime/lib/auth/session-policy.ts";
const DAY_MS = 86_400_000;
const NOW = new Date("2026-11-07T12:00:00.000Z");

/** The policy module shape that the contract pins. */
interface PolicyModule {
  SESSION_MAX_AGE_S: number;
  RENEW_BELOW_DAYS: number;
  CAP_CLASS: number;
  CAP_FAMILY: number;
  CAP_TEACHER: number;
  MEDIA_URL_EXPIRES_S: number;
  sessionCapForRole(role: string): number;
  isSessionActive(session: { expiresAt: Date; disabled?: boolean }, now: Date): boolean;
  shouldRenew(session: { expiresAt: Date }, now: Date): boolean;
  renewalExpiry(now: Date): Date;
  planRenewal(
    session: { expiresAt: Date; lastRenewedAt: Date | null },
    now: Date,
  ): { renew: boolean; expiresAt: Date };
}

/** Loads the policy module after the pinned path check. */
async function loadPolicy(): Promise<PolicyModule> {
  return (await import("../lib/auth/session-policy.js")) as PolicyModule;
}

if (existsSync(POLICY)) {
  storeContractSuite("fake", async () => {
    fakeStoreState.current = createFakeStore();
    return fakeStoreState.current as never;
  });
} else {
  describe("login session policy (red)", () => {
    it("needs the pinned policy module for the store contract", () => {
      expect(existsSync(POLICY), MISSING).toBe(true);
    });
  });
}

describe("login session policy (red)", () => {
  it("gives the class cap 30 and the family and teacher caps 5", async () => {
    expect(existsSync(POLICY), MISSING).toBe(true);
    const policy = await loadPolicy();
    expect(policy.CAP_CLASS, "CAP_CLASS").toBe(30);
    expect(policy.CAP_FAMILY, "CAP_FAMILY").toBe(5);
    expect(policy.CAP_TEACHER, "CAP_TEACHER").toBe(5);
    expect(policy.sessionCapForRole("class")).toBe(30);
    expect(policy.sessionCapForRole("family")).toBe(5);
    expect(policy.sessionCapForRole("teacher")).toBe(5);
    expect(() => policy.sessionCapForRole("admin")).toThrow();
  });

  it("ends a session at its expiry time and for a disabled account", async () => {
    expect(existsSync(POLICY), MISSING).toBe(true);
    const policy = await loadPolicy();
    expect(policy.isSessionActive({ expiresAt: NOW }, NOW), "expiresAt == now is no session").toBe(
      false,
    );
    expect(
      policy.isSessionActive({ expiresAt: new Date(NOW.getTime() - 1000) }, NOW),
      "one second before the expiry is a session",
    ).toBe(true);
    expect(
      policy.isSessionActive({ expiresAt: new Date(NOW.getTime() + DAY_MS), disabled: true }, NOW),
      "a disabled account is no session",
    ).toBe(false);
    expect(
      policy.isSessionActive({ expiresAt: new Date(NOW.getTime() + DAY_MS) }, NOW),
      "one second before is active",
    ).toBe(true);
  });

  it("renews below 335 days left and sets a 365-day expiry", async () => {
    expect(existsSync(POLICY), MISSING).toBe(true);
    const policy = await loadPolicy();
    expect(policy.SESSION_MAX_AGE_S, "SESSION_MAX_AGE_S").toBe(31_536_000);
    expect(policy.RENEW_BELOW_DAYS, "RENEW_BELOW_DAYS").toBe(335);
    const exactly = new Date(NOW.getTime() + 335 * DAY_MS);
    expect(policy.shouldRenew({ expiresAt: exactly }, NOW), "335 days left does not renew").toBe(
      false,
    );
    const below = new Date(NOW.getTime() + 335 * DAY_MS - 3_600_000);
    expect(policy.shouldRenew({ expiresAt: below }, NOW), "334 days 23 hours renews").toBe(true);
    expect(policy.renewalExpiry(NOW).getTime(), "the new expiry is 365 days").toBe(
      NOW.getTime() + 365 * DAY_MS,
    );
  });

  it("writes at most one renewal each day", async () => {
    expect(existsSync(POLICY), MISSING).toBe(true);
    const policy = await loadPolicy();
    const below = new Date(NOW.getTime() + 100 * DAY_MS);
    const first = policy.planRenewal({ expiresAt: below, lastRenewedAt: null }, NOW);
    expect(first.renew, "the first use renews").toBe(true);
    expect(first.expiresAt.getTime()).toBe(NOW.getTime() + 365 * DAY_MS);
    const sameDay = policy.planRenewal(
      { expiresAt: below, lastRenewedAt: new Date(NOW.getTime() - 3_600_000) },
      NOW,
    );
    expect(sameDay.renew, "a second use on the same day does not renew").toBe(false);
    const nextDay = policy.planRenewal(
      { expiresAt: below, lastRenewedAt: new Date("2026-11-06T23:59:59.000Z") },
      NOW,
    );
    expect(nextDay.renew, "the next day renews again").toBe(true);
  });
});
