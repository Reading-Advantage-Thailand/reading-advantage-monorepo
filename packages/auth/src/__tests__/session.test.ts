import { describe, it, expect, vi } from "vitest";
import { createSession, validateSession, deleteSession } from "../session.js";

vi.mock("@reading-advantage/db/schema", () => ({
  sessions: {
    id: "id",
    token: "token",
    userId: "user_id",
    expiresAt: "expires_at",
  },
  users: {
    id: "id",
    username: "username",
    name: "name",
    role: "role",
    schoolId: "school_id",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, type: "eq" })),
}));

const mockSessionRow = {
  id: "s1",
  token: "abc123token",
  userId: "u1",
  expiresAt: new Date(Date.now() + 86400000),
};

const mockUserRow = {
  id: "u1",
  username: "testuser",
  name: "Test",
  role: "STUDENT",
  schoolId: "s1",
};

function createMockDb(overrides: {
  insertReturning?: unknown[];
  selectResults?: unknown[];
} = {}) {
  const resolvedSelect = overrides.selectResults ?? [];

  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(overrides.insertReturning ?? [mockSessionRow]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(resolvedSelect),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  return mockDb;
}

type SessionDb = Parameters<typeof createSession>[0];

function asSessionDb(db: ReturnType<typeof createMockDb>): SessionDb {
  return db as unknown as SessionDb;
}

describe("createSession", () => {
  it("creates a session and returns it with user", async () => {
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [mockUserRow],
    });

    const session = await createSession(asSessionDb(db), "u1");

    expect(session.id).toBe("s1");
    expect(session.token).toBeDefined();
    expect(typeof session.token).toBe("string");
    expect(session.userId).toBe("u1");
    expect(session.user.id).toBe("u1");
    expect(session.user.username).toBe("testuser");
    expect(session.user.role).toBe("STUDENT");
    expect(session.user.schoolId).toBe("s1");
    expect(session.expiresAt).toBeInstanceOf(Date);
  });

  it("throws when user not found after session creation", async () => {
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [],
    });

    await expect(createSession(asSessionDb(db), "u1")).rejects.toThrow(
      /User not found/
    );
  });
});

describe("validateSession", () => {
  it("returns session when token is valid", async () => {
    const db = createMockDb({
      selectResults: [mockSessionRow],
    });

    // Override select to return user on second call
    let callCount = 0;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 1) return Promise.resolve([mockSessionRow]);
            return Promise.resolve([mockUserRow]);
          }),
        }),
      }),
    });

    const session = await validateSession(asSessionDb(db), "abc123token");

    expect(session).not.toBeNull();
    expect(session!.id).toBe("s1");
    expect(session!.user.username).toBe("testuser");
  });

  it("returns null when token not found", async () => {
    const db = createMockDb({ selectResults: [] });

    const session = await validateSession(asSessionDb(db), "bad-token");

    expect(session).toBeNull();
  });

  it("returns null and deletes expired session", async () => {
    const expiredSession = {
      ...mockSessionRow,
      expiresAt: new Date(Date.now() - 86400000),
    };

    const db = createMockDb({ selectResults: [expiredSession] });

    const session = await validateSession(asSessionDb(db), "expired-token");

    expect(session).toBeNull();
    expect(db.delete).toHaveBeenCalled();
  });

  it("returns null when user no longer exists", async () => {
    const db = createMockDb();

    let callCount = 0;
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount <= 1) return Promise.resolve([mockSessionRow]);
            return Promise.resolve([]);
          }),
        }),
      }),
    });

    const session = await validateSession(asSessionDb(db), "valid-token");

    expect(session).toBeNull();
  });
});

describe("deleteSession", () => {
  it("deletes session by token", async () => {
    const db = createMockDb();

    await deleteSession(asSessionDb(db), "some-token");

    expect(db.delete).toHaveBeenCalled();
  });

  it("does not throw when delete fails", async () => {
    const db = createMockDb();
    db.delete.mockReturnValue({
      where: vi.fn().mockRejectedValue(new Error("DB error")),
    });

    await expect(deleteSession(asSessionDb(db), "some-token")).resolves
      .toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 9: FR-1 session token hashing
// ---------------------------------------------------------------------------
//
// FR-1: createSession must hash the generated token with SHA-256 before
// writing to the sessions row. validateSession / deleteSession must hash
// the incoming token before the DB lookup. The raw token is only ever
// held in memory and sent in the cookie.
//
// Test strategy:
//   - Spy on the values object handed to db.insert(...).values(...) so we
//     can inspect the persisted row.
//   - For validateSession, the row's tokenHash must match sha256(incoming
//     token) and the lookup column must be `tokenHash`, not `token`.
//   - Hash-of-hash: a caller that already hashed the token must NOT be
//     able to validate (the second hash is a different value).
//   - deleteSession must use the hashed value in its .where() clause.
//
// RED expectations:
//   - session.ts currently writes `token` (raw) — the row will carry the
//     raw token, the `tokenHash` column will be absent → 3 assertions fail.
//   - validateSession looks up by `sessions.token` (raw) — the hashed
//     lookup will return [] and the assertion will fail.
//   - deleteSession uses `sessions.token` (raw) — same.
//
// Test command:
//   cd packages/auth && npx vitest run src/__tests__/session.test.ts
// ---------------------------------------------------------------------------

import { createHash } from "node:crypto";

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

// Capture the row object that createSession passes to db.insert(...).values(...).
// The mock chain in createMockDb is `db.insert(table).values(row).returning()`,
// so the row lives at `db.insert.mock.results[0].value.values.mock.calls[0][0]`.
function captureInsertValuesArg(
  db: ReturnType<typeof createMockDb>
): Record<string, unknown> | undefined {
  const insertResults = (
    db.insert as unknown as {
      mock: { results: Array<{ value: { values: { mock: { calls: unknown[][] } } } }> };
    }
  ).mock.results;
  const valuesFn = insertResults[0]?.value?.values;
  const valuesCall = valuesFn?.mock?.calls?.[0];
  return valuesCall?.[0] as Record<string, unknown> | undefined;
}

describe("Phase 2 — Task 9: FR-1 session token hashing", () => {
  it("createSession writes tokenHash = sha256(token), NOT the raw token", async () => {
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [mockUserRow],
    });

    const session = await createSession(asSessionDb(db), "u1");
    const valuesArg = captureInsertValuesArg(db);

    // The row must carry a tokenHash field, and it must equal sha256 of
    // the raw token (which the response body still exposes to the caller).
    expect(
      valuesArg,
      "Expected db.insert(sessions).values(...) to receive a row object. " +
        "If the values(...) call has not been recorded, the mock chain in " +
        "createMockDb is wrong for this test.",
    ).toBeDefined();
    expect(
      valuesArg?.["tokenHash"],
      "Expected the inserted row to carry a `tokenHash` field so a DB read " +
        "never reveals a raw bearer token. FR-1 closes the raw-token-at-rest " +
        "leak.",
    ).toBe(sha256Hex(session.token));
  });

  it("createSession does NOT write a raw `token` column (drop is deferred — FR-1 keeps the column dormant)", async () => {
    // Note: the migration keeps `token` (drop deferred — Phase 2 follow-up
    // migration). The contract is that the NEW writes do not put the raw
    // token into the row. This guards the implementation from regressing
    // and re-inserting the raw token alongside the hash.
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [mockUserRow],
    });

    const session = await createSession(asSessionDb(db), "u1");
    const valuesArg = captureInsertValuesArg(db);

    expect(
      valuesArg,
      "Expected db.insert(sessions).values(...) to receive a row object.",
    ).toBeDefined();
    // The raw token MUST NOT appear in the row. If the implementation
    // currently writes the raw token, this assertion fires — pin the
    // contract for Green.
    expect(
      valuesArg?.["token"],
      "createSession must NOT persist the raw token in the new row. " +
        "FR-1 says only the hash reaches the database; the raw token " +
        "lives in the cookie only. The deferred-drop column must be " +
        "left null/empty by new writes so a follow-up migration can " +
        "drop it without data loss.",
    ).not.toBe(session.token);
    expect(
      valuesArg?.["token"],
      "createSession must NOT persist the raw token in the new row (the " +
        "raw token must not appear under any key, including token).",
    ).toBeUndefined();
  });

  it("validateSession(db, rawToken) looks up by sha256(rawToken) and returns the session", async () => {
    // The DB row is stored with tokenHash. The mock returns that row only
    // if the lookup matches. To prove the lookup used the hash, we wire
    // the select() to return the row only when the eq() condition is the
    // hashed value.
    const rawToken = "user-supplied-cookie-token";
    const expectedHash = sha256Hex(rawToken);
    const hashedRow = {
      ...mockSessionRow,
      token: undefined,
      tokenHash: expectedHash,
    };

    const db = createMockDb();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation((arg: unknown) => {
            // If the call receives the raw token, simulate "no row" (lookup
            // missed). If the call receives the hash, return the row.
            const v = (arg as { val: unknown })?.val;
            if (v === expectedHash) {
              return Promise.resolve([hashedRow]);
            }
            return Promise.resolve([]);
          }),
        }),
      }),
    });

    const session = await validateSession(asSessionDb(db), rawToken);

    // Implementation must pass sha256(rawToken) into the .where() clause.
    // The drizzle-orm mock makes eq() return `{ col, val, type: "eq" }`;
    // for a sha256-lookup the val will be the hex digest. We assert
    // that by intercepting the eq() symbol and reading its call.
    const eqMod = (await import("drizzle-orm")) as unknown as {
      eq: ReturnType<typeof vi.fn>;
    };

    expect(
      eqMod.eq,
      "drizzle-orm.eq must be imported by session.ts so the sha256 lookup " +
        "can be expressed as eq(sessions.tokenHash, sha256(token)).",
    ).toBeDefined();
    const eqCalls = (
      eqMod.eq as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls;
    const lastEq = eqCalls[eqCalls.length - 1] as unknown[] | undefined;
    expect(
      lastEq?.[1],
      "Expected validateSession to call eq(sessions.tokenHash, <hash>) as " +
        "the lookup condition. A raw-token lookup defeats FR-1 — the DB " +
        "has only hashes, so the lookup will never match.",
    ).toBe(expectedHash);
    expect(session, "Expected validateSession to return the session row " +
      "when the incoming raw token hashes to the stored tokenHash.").not.toBeNull();
  });

  it("validateSession(db, sha256(rawToken)) returns null — hash-of-hash is not accepted", async () => {
    // A naive double-hash (e.g., a caller that pre-hashed a token) must
    // not be able to validate. The implementation should hash the
    // incoming token once, so sha256(rawToken) becomes sha256(sha256(rawToken))
    // on lookup — which never matches the stored sha256(rawToken).
    const rawToken = "user-supplied-cookie-token";
    const preHashedToken = sha256Hex(rawToken);
    const expectedStoredHash = sha256Hex(rawToken);

    const db = createMockDb();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation((arg: unknown) => {
            // Only return the row when the lookup value is the hash of
            // the raw token (which sha256(preHashed) is NOT).
            const v = (arg as { val: unknown })?.val;
            if (v === expectedStoredHash) return Promise.resolve([mockSessionRow]);
            return Promise.resolve([]);
          }),
        }),
      }),
    });

    const session = await validateSession(asSessionDb(db), preHashedToken);

    expect(
      session,
      "validateSession must NOT accept a pre-hashed token. The current " +
        "implementation looks up by the raw column, so a pre-hashed " +
        "token would silently fail to match — and once FR-1 lands, the " +
        "double-hash will diverge from the stored hash. This assertion " +
        "pins the contract: only the raw cookie value validates.",
    ).toBeNull();
  });

  it("deleteSession(db, rawToken) deletes by sha256(rawToken)", async () => {
    const rawToken = "user-supplied-cookie-token";
    const expectedHash = sha256Hex(rawToken);

    const db = createMockDb();
    db.delete.mockReturnValue({
      where: vi.fn().mockReturnValue(Promise.resolve(undefined)),
    });

    await deleteSession(asSessionDb(db), rawToken);

    const eqMod = (await import("drizzle-orm")) as unknown as {
      eq: ReturnType<typeof vi.fn>;
    };
    const eqCalls = (
      eqMod.eq as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls;
    const lastEq = eqCalls[eqCalls.length - 1] as unknown[] | undefined;
    expect(
      lastEq?.[1],
      "Expected deleteSession to call eq(sessions.tokenHash, <hash>) as " +
        "the deletion predicate. A raw-token delete would leave orphaned " +
        "rows in the DB (the column only carries hashes).",
    ).toBe(expectedHash);
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 10: FR-8 ipAddress/userAgent + FR-10 session cap at 10
// ---------------------------------------------------------------------------
//
// FR-8: createSession must accept opts.ipAddress and opts.userAgent and
//       write them to the row.
// FR-10: Before insert, count sessions for userId. If >= 10, delete the
//        oldest (by createdAt) row for that user.
//
// Test strategy:
//   - Capture the values() payload to assert ipAddress/userAgent appear.
//   - For the cap, simulate the count returning >= 10 and assert that
//     db.delete() was called against sessions to evict the oldest row.
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 10: FR-8 ipAddress/userAgent + FR-10 session cap", () => {
  it("createSession persists ipAddress and userAgent from opts onto the row", async () => {
    const db = createMockDb({
      insertReturning: [mockSessionRow],
      selectResults: [mockUserRow],
    });

    await createSession(asSessionDb(db), "u1", {
      ipAddress: "1.2.3.4",
      userAgent: "TestUA/1.0",
    });

    const valuesArg = captureInsertValuesArg(db);

    expect(
      valuesArg,
      "Expected db.insert(sessions).values(...) to receive a row object.",
    ).toBeDefined();
    expect(
      valuesArg?.["ipAddress"],
      "Expected the inserted row to carry `ipAddress` from the opts " +
        "argument so audit / forensic queries can correlate sessions with " +
        "network origins. FR-8 closes the existing dead column.",
    ).toBe("1.2.3.4");
    expect(
      valuesArg?.["userAgent"],
      "Expected the inserted row to carry `userAgent` from the opts " +
        "argument. FR-8 populates the existing dead column.",
    ).toBe("TestUA/1.0");
  });

  it("createSession enforces a 10-session cap by deleting the oldest row when 10 already exist", async () => {
    // Wire the select to return a count of 10 existing sessions (cap reached),
    // then return the user row on the next call so createSession completes.
    const db = createMockDb();
    let selectCall = 0;
    db.select.mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // First select: the FR-10 count() — return 10 to trigger eviction.
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 10 }]),
          }),
        };
      }
      if (selectCall === 2) {
        // Second select: FR-10 delete-the-oldest lookup — return one row.
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: "oldest-session-id", createdAt: new Date(0) },
                ]),
              }),
            }),
          }),
        };
      }
      // Third select: the user lookup to assemble the session response.
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUserRow]),
          }),
        }),
      };
    });
    db.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    db.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockSessionRow]),
      }),
    });

    await createSession(asSessionDb(db), "u1");

    expect(
      db.delete,
      "Expected db.delete(sessions) to be called when the per-user session " +
        "count is at or above the 10-session cap. FR-10 enforces a rolling " +
        "window of <= 10 active sessions per user.",
    ).toHaveBeenCalled();
    // The eviction must target the oldest session by createdAt.
    expect(
      selectCall >= 2,
      "Expected createSession to first query the count of active sessions " +
        "for the user before inserting. The Red state does not run a count " +
        "query at all — Green must add a count() (or equivalent) that " +
        "feeds the eviction decision.",
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 2 — Task 13: FR-7a revokeAllUserSessions
// ---------------------------------------------------------------------------
//
// FR-7a: revokeAllUserSessions(db, userId) deletes ALL session rows for
//        userId and returns { revoked: <count> }. Subsequent
//        validateSession calls for the revoked tokens must return null.
//
// Test strategy:
//   - Mock db.delete to return a known count via the .returning() chain.
//   - Verify the .where() clause is eq(sessions.userId, userId).
//   - After revocation, validateSession lookups for the revoked tokens
//     must return null (no row matches).
// ---------------------------------------------------------------------------

describe("Phase 2 — Task 13: FR-7a revokeAllUserSessions", () => {
  it("revokeAllUserSessions deletes all rows for userId and returns { revoked: 3 }", async () => {
    const db = createMockDb();
    db.delete.mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "s1", userId: "u1" },
          { id: "s2", userId: "u1" },
          { id: "s3", userId: "u1" },
        ]),
      }),
    });

    // Use the actual export — session.ts throws a stub currently.
    const { revokeAllUserSessions } = await import("../session.js");
    const result = await revokeAllUserSessions(asSessionDb(db), "u1");

    expect(
      result.revoked,
      "Expected revokeAllUserSessions to return the number of deleted " +
        "rows (3) so the caller can log the revocation count and decide " +
        "whether to refresh tokens. The Phase 1 stub throws — Green must " +
        "replace it with a DELETE ... RETURNING implementation.",
    ).toBe(3);
  });

  it("validateSession returns null for all tokens previously revoked by revokeAllUserSessions", async () => {
    // After revocation, the DB has no rows for those tokens. We simulate
    // that by returning [] for all validateSession lookups.
    const db = createMockDb();
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const sessionA = await validateSession(asSessionDb(db), "token-a");
    const sessionB = await validateSession(asSessionDb(db), "token-b");
    const sessionC = await validateSession(asSessionDb(db), "token-c");

    expect(
      sessionA,
      "Expected validateSession to return null after revokeAllUserSessions " +
        "deleted the underlying rows — the row is gone, so the lookup " +
        "yields no match.",
    ).toBeNull();
    expect(sessionB).toBeNull();
    expect(sessionC).toBeNull();
  });
});
