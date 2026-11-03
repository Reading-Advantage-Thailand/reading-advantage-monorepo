import type postgres from "postgres";
import { vi } from "vitest";

/** Result source for one scripted statement: fixed rows or a function of the call. */
export type ScriptedResponse =
  | readonly Record<string, unknown>[]
  | ((statement: string, values: readonly unknown[]) => unknown);

/** A postgres.js test double that records statements and returns scripted rows. */
export interface ScriptedSql {
  /** The client-shaped double passed to the code under test. */
  readonly sql: postgres.Sql;
  /** Statement text in execution order, with `?` for each binding. */
  readonly statements: string[];
  /** Bound values in execution order. */
  readonly bindings: (readonly unknown[])[];
  /** Number of `begin` calls. */
  readonly transactions: () => number;
}

/**
 * Creates a transaction-capable postgres.js double that answers queries in order.
 * @param responses Results for each tagged query in execution order; a function
 *   result is awaited, and a thrown error rejects the query.
 * @returns The double and its captured statements and bindings.
 * @throws When the code runs more statements than the script holds.
 */
export function scriptedSql(responses: readonly ScriptedResponse[]): ScriptedSql {
  const pending = [...responses];
  const statements: string[] = [];
  const bindings: (readonly unknown[])[] = [];
  let transactions = 0;
  const tagged = vi.fn((strings: TemplateStringsArray | string | readonly unknown[], ...values: unknown[]) => {
    if (isHelperCall(strings)) return { helper: strings };
    return run(strings, values);
  });
  const run = async (strings: TemplateStringsArray | string, values: unknown[]) => {
    const text = typeof strings === "string" ? strings : strings.join("?");
    statements.push(text);
    bindings.push(values);
    const response = pending.shift();
    if (response === undefined) throw new Error(`Unexpected SQL statement: ${text}`);
    return typeof response === "function" ? await response(text, values) : response;
  };
  return finish(tagged, run, statements, bindings, () => transactions, () => { transactions += 1; });
}

/** One route of a routed SQL double: a statement pattern and its result. */
export interface SqlRoute {
  /** Substring or pattern the statement text must match. */
  readonly match: string | RegExp;
  /**
   * Fixed rows, or a function of the statement, its values and the route's call
   * count; a thrown error rejects the query.
   */
  readonly rows: readonly Record<string, unknown>[] | ((values: readonly unknown[], call: number, statement: string) => unknown);
}

/**
 * Creates a postgres.js double that answers each statement by its first matching route.
 * @param routes Routes checked in order; an unmatched statement returns no rows.
 * @returns The double and its captured statements and bindings.
 */
export function routedSql(routes: readonly SqlRoute[]): ScriptedSql {
  const statements: string[] = [];
  const bindings: (readonly unknown[])[] = [];
  const calls = new Map<SqlRoute, number>();
  let transactions = 0;
  const run = async (strings: TemplateStringsArray | string, values: unknown[]) => {
    const text = typeof strings === "string" ? strings : strings.join("?");
    statements.push(text);
    bindings.push(values);
    const route = routes.find((candidate) => typeof candidate.match === "string" ? text.includes(candidate.match) : candidate.match.test(text));
    if (route === undefined) return [];
    const call = calls.get(route) ?? 0;
    calls.set(route, call + 1);
    return typeof route.rows === "function" ? await route.rows(values, call, text) : route.rows;
  };
  const tagged = vi.fn((strings: TemplateStringsArray | string | readonly unknown[], ...values: unknown[]) => {
    if (isHelperCall(strings)) return { helper: strings };
    return run(strings, values);
  });
  return finish(tagged, run, statements, bindings, () => transactions, () => { transactions += 1; });
}

/**
 * Tells a `sql(values)` helper call apart from a tagged template call.
 * @param strings First argument of the call.
 * @returns True for a helper call.
 */
function isHelperCall(
  strings: TemplateStringsArray | string | readonly unknown[],
): strings is readonly unknown[] {
  return typeof strings !== "string" && !("raw" in strings);
}

/**
 * Adds the postgres.js client methods used by the adapters to a tagged double.
 * @param tagged Tagged template function.
 * @param run Statement runner used by `unsafe`.
 * @param statements Captured statement text.
 * @param bindings Captured values.
 * @param count Reads the transaction count.
 * @param increment Adds one to the transaction count.
 * @returns The finished double.
 */
function finish(
  tagged: unknown,
  run: (strings: string, values: unknown[]) => Promise<unknown>,
  statements: string[],
  bindings: (readonly unknown[])[],
  count: () => number,
  increment: () => void,
): ScriptedSql {
  const sql = tagged as postgres.Sql;
  Object.assign(sql, {
    begin: async <T>(...args: unknown[]) => {
      increment();
      const work = args.at(-1) as (transaction: postgres.TransactionSql) => Promise<T>;
      return await work(sql as unknown as postgres.TransactionSql);
    },
    json: (value: unknown) => value,
    unsafe: (text: string, values: unknown[] = []) => run(text, values),
  });
  return { sql, statements, bindings, transactions: count };
}
