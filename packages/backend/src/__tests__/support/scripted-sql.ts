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
  const tagged = vi.fn(async (strings: TemplateStringsArray | string, ...values: unknown[]) => {
    const text = typeof strings === "string" ? strings : strings.join("?");
    statements.push(text);
    bindings.push(values);
    const response = pending.shift();
    if (response === undefined) throw new Error(`Unexpected SQL statement: ${text}`);
    return typeof response === "function" ? await response(text, values) : response;
  });
  const sql = tagged as unknown as postgres.Sql;
  Object.assign(sql, {
    begin: async <T>(...args: unknown[]) => {
      transactions += 1;
      const work = args.at(-1) as (transaction: postgres.TransactionSql) => Promise<T>;
      return await work(sql as unknown as postgres.TransactionSql);
    },
    json: (value: unknown) => value,
    unsafe: (text: string, values: readonly unknown[] = []) => tagged(text, ...values),
  });
  return { sql, statements, bindings, transactions: () => transactions };
}
