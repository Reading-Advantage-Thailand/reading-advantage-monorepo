/**
 * In-memory Storytime store for the app tests (test strategy P2b.5, task 2b.2).
 *
 * The app tests inject this store through `vi.mock("../lib/auth/store")`. The
 * shared suite in `packages/backend/src/modules/storytime-access/__tests__/store-contract.ts`
 * runs against this store and against PGlite, so the fake can not drift from the SQL.
 *
 * The signatures follow the store contract pins of P2b.2. Every time-dependent function takes an
 * explicit `now: Date`.
 */

/** The role of one Storytime account. */
export type StorytimeRole = "family" | "class" | "teacher";

/** One account row of the fake store. */
export interface FakeAccount {
  id: string;
  username: string;
  passwordHash: string;
  role: StorytimeRole;
  disabled: boolean;
  createdAt: Date;
}

/** One session row of the fake store. */
export interface FakeSession {
  tokenDigest: string;
  accountId: string;
  expiresAt: Date;
  lastUseAt: Date;
  createdAt: Date;
}

/** One audit row of the fake store. */
export interface FakeAuditEvent {
  id: number;
  action: string;
  accountId?: string;
  username?: string;
  reason?: string;
  ip?: string;
  now: Date;
}

/** One rate-limit bucket of the fake store. */
export interface FakeAttemptBucket {
  failedCount: number;
  windowStart: number;
}

/** The seed values of the fake store. */
export interface FakeStoreSeed {
  accounts?: Array<{
    username: string;
    passwordHash: string;
    role?: StorytimeRole;
    disabled?: boolean;
  }>;
}

/** The store surface that the app adapter and the contract suite use. */
export interface FakeStore {
  accounts: FakeAccount[];
  sessions: FakeSession[];
  auditEvents: FakeAuditEvent[];
  attempts: Map<string, FakeAttemptBucket>;
  findAccountByUsername(username: string): Promise<FakeAccount | null>;
  /**
   * Finds one account by its id.
   * @param accountId The account id to look up.
   * @returns The account, or `null` when no account holds that id.
   */
  findAccountById(accountId: string): Promise<FakeAccount | null>;
  createAccount(input: {
    username: string;
    passwordHash: string;
    role: StorytimeRole;
    now: Date;
  }): Promise<FakeAccount>;
  setDisabled(accountId: string, disabled: boolean): Promise<void>;
  setPasswordHash(accountId: string, passwordHash: string): Promise<void>;
  createSessionWithCap(input: {
    accountId: string;
    tokenDigest: string;
    now: Date;
    expiresAt: Date;
    cap: number;
  }): Promise<{ endedDigests: string[] }>;
  findSessionByDigest(tokenDigest: string): Promise<FakeSession | null>;
  recordUse(tokenDigest: string, now: Date): Promise<void>;
  renewSession(tokenDigest: string, expiresAt: Date, now: Date): Promise<void>;
  deleteSessionByDigest(tokenDigest: string): Promise<void>;
  rateLimitStore: {
    get(key: string): Promise<FakeAttemptBucket | undefined>;
    set(key: string, entry: FakeAttemptBucket): Promise<void>;
    delete(key: string): Promise<void>;
    consume(key: string, now: number, windowMs: number): Promise<FakeAttemptBucket>;
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

/**
 * Creates an empty fake store with optional seeded accounts.
 * @param seed The seed values.
 * @returns A new fake store.
 */
export function createFakeStore(seed: FakeStoreSeed = {}): FakeStore {
  const accounts: FakeAccount[] = [];
  const sessions: FakeSession[] = [];
  const auditEvents: FakeAuditEvent[] = [];
  const attempts = new Map<string, FakeAttemptBucket>();
  let accountSeq = 0;
  let auditSeq = 0;

  for (const entry of seed.accounts ?? []) {
    accountSeq += 1;
    accounts.push({
      id: `account-${accountSeq}`,
      username: entry.username,
      passwordHash: entry.passwordHash,
      role: entry.role ?? "family",
      disabled: entry.disabled ?? false,
      createdAt: new Date("2026-11-01T00:00:00.000Z"),
    });
  }

  const store: FakeStore = {
    accounts,
    sessions,
    auditEvents,
    attempts,
    async findAccountByUsername(username) {
      return accounts.find((account) => account.username === username) ?? null;
    },
    async findAccountById(accountId) {
      return accounts.find((account) => account.id === accountId) ?? null;
    },
    async createAccount(input) {
      if (accounts.some((account) => account.username === input.username)) {
        throw new Error("duplicate username");
      }
      accountSeq += 1;
      const created: FakeAccount = {
        id: `account-${accountSeq}`,
        username: input.username,
        passwordHash: input.passwordHash,
        role: input.role,
        disabled: false,
        createdAt: input.now,
      };
      accounts.push(created);
      return created;
    },
    async setDisabled(accountId, disabled) {
      const account = accounts.find((entry) => entry.id === accountId);
      if (!account) throw new Error(`unknown account ${accountId}`);
      account.disabled = disabled;
    },
    async setPasswordHash(accountId, passwordHash) {
      const account = accounts.find((entry) => entry.id === accountId);
      if (!account) throw new Error(`unknown account ${accountId}`);
      account.passwordHash = passwordHash;
    },
    async createSessionWithCap(input) {
      if (sessions.some((session) => session.tokenDigest === input.tokenDigest)) {
        throw new Error("duplicate token digest");
      }
      const owned = sessions
        .filter((session) => session.accountId === input.accountId)
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
      const endedDigests: string[] = [];
      while (owned.length >= input.cap) {
        const oldest = owned.shift();
        if (!oldest) break;
        const index = sessions.indexOf(oldest);
        if (index >= 0) sessions.splice(index, 1);
        endedDigests.push(oldest.tokenDigest);
      }
      sessions.push({
        tokenDigest: input.tokenDigest,
        accountId: input.accountId,
        expiresAt: input.expiresAt,
        lastUseAt: input.now,
        createdAt: input.now,
      });
      return { endedDigests };
    },
    async findSessionByDigest(tokenDigest) {
      return sessions.find((session) => session.tokenDigest === tokenDigest) ?? null;
    },
    async recordUse(tokenDigest, now) {
      const session = sessions.find((entry) => entry.tokenDigest === tokenDigest);
      if (session) session.lastUseAt = now;
    },
    async renewSession(tokenDigest, expiresAt, now) {
      const session = sessions.find((entry) => entry.tokenDigest === tokenDigest);
      if (!session) return;
      session.expiresAt = expiresAt;
      session.lastUseAt = now;
    },
    async deleteSessionByDigest(tokenDigest) {
      const index = sessions.findIndex((session) => session.tokenDigest === tokenDigest);
      if (index >= 0) sessions.splice(index, 1);
    },
    rateLimitStore: {
      async get(key) {
        return attempts.get(key);
      },
      async set(key, entry) {
        attempts.set(key, entry);
      },
      async delete(key) {
        attempts.delete(key);
      },
      async consume(key, now, windowMs) {
        const current = attempts.get(key);
        const next =
          !current || now - current.windowStart > windowMs
            ? { failedCount: 1, windowStart: now }
            : { failedCount: current.failedCount + 1, windowStart: current.windowStart };
        attempts.set(key, next);
        return next;
      },
    },
    async insertAuditEvent(event) {
      auditSeq += 1;
      auditEvents.push({ id: auditSeq, ...event });
    },
  };

  return store;
}

/**
 * The current fake store of one app test file.
 *
 * The `vi.mock("../lib/auth/store")` factory reads this value on every call, so a test can swap a
 * fresh store in `beforeEach` without a second module mock.
 */
export const fakeStoreState: { current: FakeStore } = { current: createFakeStore() };
