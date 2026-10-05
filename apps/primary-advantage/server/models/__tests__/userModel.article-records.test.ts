// @vitest-environment node
/**
 * The history search filtered the activities on `details->>'title'`, but ARTICLE_READ rows store
 * no title in details, so a search never found an article. The search must filter on the article
 * title only. The where clauses are rendered with the real Postgres dialect.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ results: [] as unknown[][], wheres: [] as unknown[] }));

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn(), currentUser: vi.fn() }));
vi.mock("@/server/utils/passwordEvents", () => ({ afterPasswordWrite: vi.fn() }));
vi.mock("@/server/utils/credentials", () => ({ hashNewPassword: vi.fn(), upsertCredentialAccount: vi.fn() }));
vi.mock("@reading-advantage/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@reading-advantage/db")>();
  /**
   * Builds a chainable select stub that records its where clause and resolves to the next result.
   * @returns The stub.
   */
  const select = () => {
    const rows = mocks.results.shift() ?? [];
    const stub: Record<string, unknown> = {};
    for (const method of ["from", "orderBy", "limit", "offset"]) stub[method] = () => stub;
    stub.where = (condition: unknown) => {
      mocks.wheres.push(condition);
      return stub;
    };
    stub.then = (resolve: (value: unknown[]) => unknown) => Promise.resolve(rows).then(resolve);
    return stub;
  };
  return { ...actual, db: { select } };
});

import { getUserArticleRecords } from "../userModel";

const dialect = new PgDialect();

beforeEach(() => {
  mocks.results.length = 0;
  mocks.wheres.length = 0;
});

describe("getUserArticleRecords search", () => {
  it("finds an article by its title although the read activity has no title in details", async () => {
    const readAt = new Date("2026-10-04T09:00:00Z");
    mocks.results.push(
      [{ targetId: "article-1", activityType: "ARTICLE_READ", completed: false, details: { type: "fiction" }, updatedAt: readAt }],
      [{ id: "article-1", title: "The Moon", rating: 0 }],
    );

    const result = await getUserArticleRecords("student-1", 1, 10, "moon");

    expect(result.data).toEqual([
      { id: "article-1", title: "The Moon", scores: "N/A", updated_at: readAt.toISOString(), rated: 0, status: "UNRATED" },
    ]);
    const [activityWhere, articleWhere] = mocks.wheres.map((condition) => dialect.sqlToQuery(condition as SQL));
    expect(activityWhere.sql).not.toContain("details");
    expect(activityWhere.params).not.toContain("%moon%");
    expect(articleWhere.sql).toMatch(/"title" ILIKE \$\d+/);
    expect(articleWhere.params).toContain("%moon%");
  });
});
