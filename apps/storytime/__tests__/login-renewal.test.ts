/**
 * The cookie renewal and the null-origin rule (Review B F47 and F45, Green r3).
 *
 * `renewSessionCookie` renews the database expiry and returns the cookie with the full lifetime
 * and the same flags, at most once each day. `assertSameOrigin` accepts the `Origin: null` of a
 * page with `Referrer-Policy: no-referrer` only with `Sec-Fetch-Site: same-origin`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeStore, fakeStoreState } from "./helpers/fake-store";
import { sessionTokenDigest } from "../lib/auth/cookie";
import { CrossOriginError, assertSameOrigin } from "../lib/auth/same-origin";
import { renewSessionCookie } from "../lib/auth/renewal";

vi.mock("../lib/auth/store", async () => {
  const helper = await import("./helpers/fake-store");
  return { getStore: () => helper.fakeStoreState.current };
});

const TOKEN = "renewal-token";
const NOW = new Date("2026-11-08T05:00:00.000Z");
const DAY_MS = 86_400_000;

/**
 * Seeds one account with one session.
 * @param daysLeft The days left on the session.
 * @param lastUseDaysAgo The days since the last write of the session.
 * @param disabled Whether the account is disabled.
 */
function seed(daysLeft: number, lastUseDaysAgo: number, disabled = false): void {
  const store = createFakeStore({
    accounts: [{ username: "staff-01", passwordHash: "x", role: "family", disabled }],
  });
  store.sessions.push({
    tokenDigest: sessionTokenDigest(TOKEN),
    accountId: store.accounts[0].id,
    expiresAt: new Date(NOW.getTime() + daysLeft * DAY_MS),
    lastUseAt: new Date(NOW.getTime() - lastUseDaysAgo * DAY_MS),
    createdAt: new Date(NOW.getTime() - 30 * DAY_MS),
  });
  fakeStoreState.current = store;
}

beforeEach(() => {
  seed(300, 2);
});

describe("session cookie renewal", () => {
  it("returns the full-lifetime cookie once, and renews the stored expiry", async () => {
    const cookie = await renewSessionCookie(TOKEN, NOW);
    expect(cookie).toBe(
      `__Host-st_session=${TOKEN}; Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=Lax`,
    );
    const row = fakeStoreState.current.sessions[0];
    expect(row.expiresAt.getTime()).toBe(NOW.getTime() + 365 * DAY_MS);
    const second = await renewSessionCookie(TOKEN, new Date(NOW.getTime() + 3_600_000));
    console.log(`renewal_first_cookie=1 renewal_second_cookie=${second === null ? 0 : 1}`);
    expect(second, "a second use on the same day sets no cookie").toBeNull();
  });

  it("sets no cookie with 335 days left or more, for an unknown token, and for a disabled account", async () => {
    seed(335, 2);
    expect(await renewSessionCookie(TOKEN, NOW), "335 days left").toBeNull();
    seed(300, 2);
    expect(await renewSessionCookie("other-token", NOW), "unknown token").toBeNull();
    seed(300, 2, true);
    expect(await renewSessionCookie(TOKEN, NOW), "disabled account").toBeNull();
    expect(fakeStoreState.current.sessions[0].expiresAt.getTime()).toBe(
      NOW.getTime() + 300 * DAY_MS,
    );
  });
});

describe("the null origin of a no-referrer page", () => {
  const OWN = "https://storytime.example.test";

  it("accepts Origin null only with Sec-Fetch-Site same-origin", () => {
    expect(() =>
      assertSameOrigin(new Headers({ origin: "null", "sec-fetch-site": "same-origin" }), OWN),
    ).not.toThrow();
    const refused: Array<Record<string, string>> = [
      {},
      { "sec-fetch-site": "cross-site" },
      { "sec-fetch-site": "same-site" },
    ];
    for (const extra of refused) {
      expect(() => assertSameOrigin(new Headers({ origin: "null", ...extra }), OWN)).toThrow(
        CrossOriginError,
      );
    }
    expect(() =>
      assertSameOrigin(
        new Headers({ origin: "https://evil.example.test", "sec-fetch-site": "same-origin" }),
        OWN,
      ),
      "a real cross-site origin stays refused whatever the header says",
    ).toThrow(CrossOriginError);
  });
});
