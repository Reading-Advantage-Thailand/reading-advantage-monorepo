/**
 * Query Optimizer Tests
 *
 * Verifies that `executeOptimizedRaw` and `executeBatchRawQueries` bind
 * parameters via Drizzle's `sql` template (no manual string interpolation,
 * no SQL injection risk).
 *
 * @jest-environment node
 */

const executeMock = jest.fn();

jest.mock("@reading-advantage/db", () => {
  const actual = jest.requireActual("@reading-advantage/db");
  return {
    ...actual,
    db: {
      execute: (...args: unknown[]) => executeMock(...args),
    },
  };
});

import { PgDialect } from "drizzle-orm/pg-core";
import { executeBatchRawQueries, executeOptimizedRaw } from "../lib/cache/query-optimizer";

const dialect = new PgDialect();
const renderSql = (sqlObj: any) => dialect.sqlToQuery(sqlObj);

describe("query-optimizer parameter binding", () => {
  beforeEach(() => {
    executeMock.mockReset();
    executeMock.mockResolvedValue([]);
  });

  it("binds $1 placeholders as parameterized fragments (no inline interpolation)", async () => {
    const injection = "x'; DROP TABLE users; --";
    const since = new Date("2026-05-01T00:00:00.000Z");

    await executeOptimizedRaw(
      "SELECT * FROM users WHERE name = $1 AND created_at >= $2",
      injection,
      since,
    );

    expect(executeMock).toHaveBeenCalledTimes(1);
    const { sql: text, params } = renderSql(executeMock.mock.calls[0][0]);

    // The literal SQL must NOT contain the raw injection payload.
    expect(text).not.toContain(injection);
    expect(text).toMatch(/\$1/);
    expect(text).toMatch(/\$2/);

    // The injection payload must arrive as a bound parameter, not inlined.
    expect(params).toEqual([injection, since]);
  });

  it("throws when a placeholder has no bound value", async () => {
    await expect(
      executeOptimizedRaw("SELECT $1, $2 FROM t", "only-one"),
    ).rejects.toThrow(/Missing bind value for placeholder \$2/);
  });

  it("executeBatchRawQueries runs each query with its own parameter bindings", async () => {
    executeMock.mockResolvedValue([{ ok: 1 }]);

    const result = await executeBatchRawQueries<{
      a: Array<{ ok: number }>;
      b: Array<{ ok: number }>;
    }>({
      a: { query: "SELECT $1::int AS ok", params: [1] },
      b: { query: "SELECT $1::int AS ok", params: [2] },
    });

    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(result.a).toEqual([{ ok: 1 }]);
    expect(result.b).toEqual([{ ok: 1 }]);

    const aRendered = renderSql(executeMock.mock.calls[0][0]);
    const bRendered = renderSql(executeMock.mock.calls[1][0]);
    expect(aRendered.params).toEqual([1]);
    expect(bRendered.params).toEqual([2]);
  });
});
