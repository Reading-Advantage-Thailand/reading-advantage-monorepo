/**
 * The shared Storytime store contract suite (test strategy P2b.5, task 2b.2).
 *
 * One list of store behaviors runs against the app fake store and against PGlite over the real
 * store. A fake that only proves itself (anti-pattern A2) fails the PGlite run.
 *
 * This file is not a test file. The two owners register the suite:
 * - `packages/backend/src/modules/storytime-access/__tests__/store.contract.test.ts` (PGlite)
 * - `apps/storytime/__tests__/login-session-policy.test.ts` (fake)
 */
import { describe, expect, it } from "vitest";

/** One account row of the contract. */
export interface ContractAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  disabled: boolean;
}

/** One session row of the contract. */
export interface ContractSession {
  tokenDigest: string;
  accountId: string;
  expiresAt: Date;
  lastUseAt: Date;
  createdAt: Date;
}

/** One rate-limit bucket of the contract. */
export interface ContractBucket {
  failedCount: number;
  windowStart: number;
}

/** The store surface of the contract (P2b.2 pins). */
export interface ContractStore {
  findAccountByUsername(username: string): Promise<ContractAccount | null>;
  createAccount(input: {
    username: string;
    passwordHash: string;
    role: string;
    now: Date;
  }): Promise<ContractAccount>;
  setDisabled(accountId: string, disabled: boolean): Promise<void>;
  setPasswordHash(accountId: string, passwordHash: string): Promise<void>;
  createSessionWithCap(input: {
    accountId: string;
    tokenDigest: string;
    now: Date;
    expiresAt: Date;
    cap: number;
  }): Promise<{ endedDigests: string[] }>;
  findSessionByDigest(tokenDigest: string): Promise<ContractSession | null>;
  recordUse(tokenDigest: string, now: Date): Promise<void>;
  renewSession(tokenDigest: string, expiresAt: Date, now: Date): Promise<void>;
  deleteSessionByDigest(tokenDigest: string): Promise<void>;
  rateLimitStore: {
    get(key: string): Promise<ContractBucket | undefined>;
    set(key: string, entry: ContractBucket): Promise<void>;
    delete(key: string): Promise<void>;
    consume(key: string, now: number, windowMs: number): Promise<ContractBucket>;
  };
  insertAuditEvent(event: {
    action: string;
    accountId?: string;
    username?: string;
    reason?: string;
    ip?: string;
    now: Date;
  }): Promise<void>;
}

/** The pinned Argon2id hash prefix of every Storytime password. */
const HASH = "$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$c2FsdA";

/** A 64-character lower-case hex digest for case `n`. */
function digest(n: number): string {
  return n.toString(16).padStart(64, "0");
}

/** The day in milliseconds. */
const DAY_MS = 86_400_000;

/**
 * Registers the shared store contract suite.
 * @param label The store under test, for example `fake` or `pglite`.
 * @param makeStore Gives a clean store for one case.
 */
export function storeContractSuite(
  label: string,
  makeStore: () => Promise<ContractStore>,
): void {
  const base = new Date("2026-11-07T00:00:00.000Z");
  const expiry = new Date(base.getTime() + 365 * DAY_MS);

  describe(`store contract (${label})`, () => {
    it("creates an account and finds it by its username", async () => {
      const store = await makeStore();
      const created = await store.createAccount({
        username: "staff-01",
        passwordHash: HASH,
        role: "family",
        now: base,
      });
      expect(created.username).toBe("staff-01");
      expect(created.role).toBe("family");
      expect(created.disabled).toBe(false);
      const found = await store.findAccountByUsername("staff-01");
      expect(found?.id).toBe(created.id);
      expect(await store.findAccountByUsername("nobody")).toBeNull();
    });

    it("sets the disabled flag and replaces the password hash", async () => {
      const store = await makeStore();
      const created = await store.createAccount({
        username: "staff-02",
        passwordHash: HASH,
        role: "teacher",
        now: base,
      });
      await store.setDisabled(created.id, true);
      expect((await store.findAccountByUsername("staff-02"))?.disabled).toBe(true);
      await store.setDisabled(created.id, false);
      expect((await store.findAccountByUsername("staff-02"))?.disabled).toBe(false);
      const next = "$argon2id$v=19$m=19456,t=2,p=1$b3RoZXI$b3RoZXI";
      await store.setPasswordHash(created.id, next);
      expect((await store.findAccountByUsername("staff-02"))?.passwordHash).toBe(next);
    });

    it("ends the oldest session at the cap and keeps the newest last use", async () => {
      const store = await makeStore();
      const account = await store.createAccount({
        username: "staff-03",
        passwordHash: HASH,
        role: "family",
        now: base,
      });
      for (let index = 1; index <= 5; index += 1) {
        await store.createSessionWithCap({
          accountId: account.id,
          tokenDigest: digest(index),
          now: new Date(base.getTime() + index * 1000),
          expiresAt: expiry,
          cap: 5,
        });
      }
      // The last-use order is the opposite of the creation order. A store that ends the least
      // recently used session ends digest(5); the correct store ends digest(1) by createdAt.
      await store.recordUse(digest(1), new Date(base.getTime() + 500_000));
      await store.recordUse(digest(5), new Date(base.getTime() + 100_000));
      const result = await store.createSessionWithCap({
        accountId: account.id,
        tokenDigest: digest(6),
        now: new Date(base.getTime() + 900_000),
        expiresAt: expiry,
        cap: 5,
      });
      expect(result.endedDigests).toEqual([digest(1)]);
      expect(await store.findSessionByDigest(digest(1))).toBeNull();
      expect(await store.findSessionByDigest(digest(5))).not.toBeNull();
      expect(await store.findSessionByDigest(digest(6))).not.toBeNull();
    });

    it("keeps 30 sessions for a class cap and ends the oldest at the 31st", async () => {
      const store = await makeStore();
      const account = await store.createAccount({
        username: "demo-class-01",
        passwordHash: HASH,
        role: "class",
        now: base,
      });
      for (let index = 1; index <= 30; index += 1) {
        await store.createSessionWithCap({
          accountId: account.id,
          tokenDigest: digest(index),
          now: new Date(base.getTime() + index * 1000),
          expiresAt: expiry,
          cap: 30,
        });
      }
      const result = await store.createSessionWithCap({
        accountId: account.id,
        tokenDigest: digest(31),
        now: new Date(base.getTime() + 31_000),
        expiresAt: expiry,
        cap: 30,
      });
      expect(result.endedDigests).toEqual([digest(1)]);
      expect(await store.findSessionByDigest(digest(1))).toBeNull();
      expect(await store.findSessionByDigest(digest(31))).not.toBeNull();
    });

    it("rejects a duplicate token digest", async () => {
      const store = await makeStore();
      const account = await store.createAccount({
        username: "staff-04",
        passwordHash: HASH,
        role: "family",
        now: base,
      });
      const input = {
        accountId: account.id,
        tokenDigest: digest(9),
        now: base,
        expiresAt: expiry,
        cap: 5,
      };
      await store.createSessionWithCap(input);
      await expect(store.createSessionWithCap(input)).rejects.toThrow();
    });

    it("records the last use and renews the expiry", async () => {
      const store = await makeStore();
      const account = await store.createAccount({
        username: "staff-05",
        passwordHash: HASH,
        role: "family",
        now: base,
      });
      await store.createSessionWithCap({
        accountId: account.id,
        tokenDigest: digest(10),
        now: base,
        expiresAt: expiry,
        cap: 5,
      });
      const usedAt = new Date(base.getTime() + 60_000);
      await store.recordUse(digest(10), usedAt);
      expect((await store.findSessionByDigest(digest(10)))?.lastUseAt.getTime()).toBe(
        usedAt.getTime(),
      );
      const renewedTo = new Date(base.getTime() + 400 * DAY_MS);
      const renewedAt = new Date(base.getTime() + 120_000);
      await store.renewSession(digest(10), renewedTo, renewedAt);
      const session = await store.findSessionByDigest(digest(10));
      expect(session?.expiresAt.getTime()).toBe(renewedTo.getTime());
      expect(session?.lastUseAt.getTime()).toBe(renewedAt.getTime());
    });

    it("deletes a session by its digest", async () => {
      const store = await makeStore();
      const account = await store.createAccount({
        username: "staff-06",
        passwordHash: HASH,
        role: "family",
        now: base,
      });
      await store.createSessionWithCap({
        accountId: account.id,
        tokenDigest: digest(11),
        now: base,
        expiresAt: expiry,
        cap: 5,
      });
      await store.deleteSessionByDigest(digest(11));
      expect(await store.findSessionByDigest(digest(11))).toBeNull();
      await store.deleteSessionByDigest(digest(12));
    });

    it("consumes the rate limit in one atomic step and resets the window", async () => {
      const store = await makeStore();
      const config = { windowMs: 15 * 60 * 1000, maxAttempts: 5 };
      const first = await store.rateLimitStore.consume("ip:203.0.113.7", 1_000, config.windowMs);
      expect(first.failedCount).toBe(1);
      expect(first.windowStart).toBe(1_000);
      for (let index = 2; index <= 5; index += 1) {
        await store.rateLimitStore.consume("ip:203.0.113.7", 1_000, config.windowMs);
      }
      const sixth = await store.rateLimitStore.consume(
        "ip:203.0.113.7",
        1_000,
        config.windowMs,
      );
      expect(sixth.failedCount).toBe(6);
      const afterWindow = await store.rateLimitStore.consume(
        "ip:203.0.113.7",
        1_000 + config.windowMs + 1,
        config.windowMs,
      );
      expect(afterWindow.failedCount).toBe(1);
      expect(afterWindow.windowStart).toBe(1_000 + config.windowMs + 1);
    });

    it("appends audit events and exposes no update or delete of the audit table", async () => {
      const store = await makeStore();
      for (const key of Object.keys(store)) {
        expect(key, "the audit table is insert only").not.toMatch(
          /^(update|delete)AuditEvent$/,
        );
      }
      await store.insertAuditEvent({
        action: "sign_in_success",
        username: "staff-01",
        now: base,
      });
      await expect(
        store.insertAuditEvent({
          action: "sign_in_failure",
          username: "staff-01",
          reason: "bad_password",
          now: new Date(base.getTime() + 1000),
        }),
      ).resolves.toBeUndefined();
    });
  });
}
