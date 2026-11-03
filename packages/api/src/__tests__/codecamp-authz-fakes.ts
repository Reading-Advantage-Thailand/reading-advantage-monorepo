/**
 * Shared fakes for the codecamp authorization tests of
 * `authz-codecamp-report.md` (commit 01f2acfe8).
 *
 * The tests run the real codecamp router against the real
 * `@reading-advantage/domain/codecamp` functions. Only the database and
 * the GitHub HTTP call are fakes, so each test proves the server behavior
 * a learner can reach through `/api/trpc`.
 */
import { vi } from "vitest";
import { getTableName, type Table } from "drizzle-orm";

export const LESSON_ID = "550e8400-e29b-41d4-a716-446655440002";
export const MODULE_ID = "550e8400-e29b-41d4-a716-446655440001";
export const REPO_ID = "550e8400-e29b-41d4-a716-446655440010";
export const REVIEW_ID = "550e8400-e29b-41d4-a716-446655440020";
export const Q1 = "550e8400-e29b-41d4-a716-446655440031";
export const Q2 = "550e8400-e29b-41d4-a716-446655440032";
export const PR_URL = "https://github.com/codecamp-org/exercise-1/pull/7";
export const testDate = new Date("2024-01-01T00:00:00Z");

/** One recorded `db.insert(table).values(values)` call. */
export interface InsertCall {
  table: string;
  values: Record<string, unknown>;
}

/**
 * Builds a fake Drizzle database whose selects return rows by table name.
 * @param rowsByTable Rows that each select from a table resolves to.
 * @returns The fake tenant DB and the list of recorded inserts.
 */
export function createFakeDb(rowsByTable: Record<string, unknown[]>) {
  const inserts: InsertCall[] = [];
  const chain = (rows: unknown[]): Record<string, unknown> => {
    const builder: Record<string, unknown> = {
      then: (onFulfilled?: (v: unknown) => unknown, onRejected?: (r: unknown) => unknown) =>
        Promise.resolve(rows).then(onFulfilled, onRejected),
    };
    for (const method of ["where", "limit", "orderBy", "innerJoin", "leftJoin", "offset", "for"]) {
      builder[method] = () => builder;
    }
    return builder;
  };
  const raw = {
    select: () => ({ from: (table: Table) => chain(rowsByTable[getTableName(table)] ?? []) }),
    insert: (table: Table) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table: getTableName(table), values });
        const returned = [{ id: REVIEW_ID, llmReviewSummary: null, reviewedAt: null, createdAt: testDate, updatedAt: testDate, ...values }];
        return {
          returning: async () => returned,
          onConflictDoUpdate: () => ({ returning: async () => returned }),
        };
      },
    }),
  };
  const tenantDb = { unscoped: () => raw };
  return { tenantDb, inserts };
}

/**
 * Builds the tRPC context for a signed-in learner.
 * @param tenantDb The fake tenant DB for this test.
 * @param userId The signed-in learner id.
 * @returns The context the codecamp router reads.
 */
export function learnerContext(tenantDb: unknown, userId = "learner-a") {
  return {
    tenantDb,
    auth: { user: { id: userId, role: "INTERN", schoolId: null }, tenant: { schoolId: null } },
  } as never;
}

/** Exercise repo row as `createPrReview` selects it. */
export const exerciseRepo = {
  id: REPO_ID,
  moduleId: MODULE_ID,
  repoUrl: "https://github.com/codecamp-org/exercise-1",
  moduleSlug: "git-basics",
};

/**
 * Stubs the GitHub pull request API with one PR author.
 * @param login The GitHub login that authored the PR, or null for an API failure.
 * @returns The fetch spy.
 */
export function stubGitHubPrAuthor(login: string | null) {
  const fetchSpy = vi.fn(async (_url: string | URL | Request) =>
    login === null
      ? new Response("rate limited", { status: 403 })
      : new Response(JSON.stringify({ user: { login } }), { status: 200, headers: { "content-type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}
