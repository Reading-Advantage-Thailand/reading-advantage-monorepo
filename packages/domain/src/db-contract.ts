import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import type { Tenant } from "@reading-advantage/auth";
import { classifyTable, type TableClassification } from "./tenant-registry.js";

// ─── Errors ────────────────────────────────────────────────

/**
 * Thrown when a TenantDB query targets a REFERENTIAL or unclassified table.
 * The error message names the offending table and the remediation.
 */
export class TenantScopeError extends Error {
  constructor(
    public readonly tableName: string,
    public readonly classification: TableClassification | "UNCLASSIFIED",
    message: string,
  ) {
    super(message);
    this.name = "TenantScopeError";
  }
}

// ─── TenantDB ─────────────────────────────────────────────

/**
 * Brand type for a DB instance that automatically injects tenant scoping
 * into select, update, and delete operations for FLAT tables (those with
 * a `schoolId` column).
 *
 * REFERENTIAL tables throw TenantScopeError — use `unscoped(reason)` to
 * access the raw DB for manual owner-FK joins.
 *
 * The relational query API (`db.query.*`) is intercepted at runtime and
 * will throw if accessed through a TenantDB instance.
 */
export interface TenantDB extends DB {
  readonly __tenantBrand: true;
  /**
   * Escape hatch: returns the raw DB for manual tenant scoping on
   * REFERENTIAL tables. The reason is recorded for auditability.
   * @param reason - Why this table needs manual scoping (greppable)
   */
  unscoped(reason: string): DB;
}

/**
 * Get a human-readable name for a Drizzle table object.
 * @param table - The table object
 * @returns The table name or "unknown"
 */
function tableNameOf(table: unknown): string {
  if (table && typeof table === "object") {
    const name = (table as Record<string | symbol, unknown>)[
      Symbol.for("drizzle:Name")
    ];
    if (typeof name === "string") return name;
  }
  return "unknown";
}

/**
 * Classify a table and throw if it's REFERENTIAL or unclassified.
 * @param table - The Drizzle table object
 * @param operation - The operation being attempted (for error messages)
 * @returns The classification (FLAT or EXEMPT only — REFERENTIAL throws)
 */
function requireScopableTable(
  table: unknown,
  operation: string,
): TableClassification {
  const classification = classifyTable(table);
  if (classification === "REFERENTIAL") {
    const name = tableNameOf(table);
    throw new TenantScopeError(
      name,
      "REFERENTIAL",
      `[TenantDB] Table "${name}" is REFERENTIAL (has no schoolId column). ` +
        `Cannot ${operation} through TenantDB. ` +
        `Use tenantDb.unscoped("reason") + a users.schoolId join, ` +
        `or add "${name}" to the EXEMPT list if it is intentionally global.`,
    );
  }
  return classification;
}

/**
 * Fail-closed guard (M-SF-2): when the tenant has no schoolId, FLAT table
 * operations cannot inject a tenant scope condition. Allowing the operation to
 * proceed would silently query across all schools — a cross-tenant data leak.
 *
 * Throws TenantScopeError for FLAT operations when schoolId is null/undefined.
 * EXEMPT tables are unaffected (intentionally global).
 * @param tenant - The tenant context
 * @param table - The Drizzle table being targeted
 * @param operation - The operation being attempted (for error messages)
 */
function requireTenantForFlat(
  tenant: Tenant,
  table: unknown,
  operation: string,
): void {
  if (!tenant.schoolId) {
    const name = tableNameOf(table);
    throw new TenantScopeError(
      name,
      "FLAT",
      `[TenantDB] Cannot ${operation} FLAT table "${name}" when tenant schoolId is ` +
        `${tenant.schoolId === undefined ? "undefined" : "null"}. ` +
        `TenantDB fails closed on null/undefined tenant to prevent cross-tenant data leaks. ` +
        `Provide a valid tenant with schoolId, or use tenantDb.unscoped("reason") + a ` +
        `users.schoolId join for global queries.`,
    );
  }
}

/**
 * Wraps a Drizzle query builder with automatic schoolId tenant scoping for
 * FLAT tables. Intercepts .where() to inject tenant conditions and ensures
 * unscoped queries are scoped before execution.
 *
 * For REFERENTIAL tables, the classification check happens at the table
 * capture point (.from(), .set(), delete arg), not here — so this function
 * only receives tables that are already verified as FLAT or EXEMPT.
 *
 * @param builder - The Drizzle query builder to wrap
 * @param table - The table being queried (used to access schoolId column)
 * @param tenant - The tenant context containing schoolId
 * @returns A proxied query builder with automatic tenant scoping
 */
function wrapQueryBuilder(builder: unknown, table: unknown, tenant: Tenant) {
  const state = { whereCalled: false };

  function createProxy(obj: unknown): unknown {
    // Don't proxy native Promises — it breaks Promise resolution
    if (obj instanceof Promise) {
      return obj;
    }
    return new Proxy(obj as object, {
      get(target, prop) {
        const val = Reflect.get(target, prop);

        // Intercept .where() to inject tenant condition
        if (prop === "where" && typeof val === "function") {
          return new Proxy(val, {
            apply(whereTarget, whereThis, whereArgs) {
              state.whereCalled = true;
              const userCondition = whereArgs[0] as SQL | undefined;

              if (
                table &&
                typeof table === "object" &&
                "schoolId" in table &&
                (table as Record<string, unknown>).schoolId !== undefined &&
                tenant.schoolId
              ) {
                const tenantCondition = eq(
                  (table as { schoolId: SQL<unknown> }).schoolId,
                  tenant.schoolId,
                );
                const newCondition = userCondition
                  ? and(tenantCondition, userCondition)
                  : tenantCondition;
                return createProxy(
                  Reflect.apply(whereTarget, whereThis, [newCondition]),
                );
              }

              return createProxy(
                Reflect.apply(whereTarget, whereThis, [userCondition]),
              );
            },
          });
        }

        // Intercept .then / .execute / .toSQL / .prepare to inject if .where() was never called
        if (
          (prop === "then" ||
            prop === "execute" ||
            prop === "toSQL" ||
            prop === "prepare") &&
          !state.whereCalled
        ) {
          if (
            table &&
            typeof table === "object" &&
            "schoolId" in table &&
            (table as Record<string, unknown>).schoolId !== undefined &&
            tenant.schoolId
          ) {
            const tenantCondition = eq(
              (table as { schoolId: SQL<unknown> }).schoolId,
              tenant.schoolId,
            );
            const newBuilder = (
              (target as Record<string, unknown>)["where"] as (
                ...args: unknown[]
              ) => unknown
            ).call(target, tenantCondition);
            const fn = (newBuilder as Record<string, unknown>)[prop];
            if (typeof fn === "function") {
              return fn.bind(newBuilder);
            }
          }
        }

        // Bind .then on thenables so Promise machinery works correctly
        if (prop === "then" && typeof val === "function") {
          return val.bind(target);
        }

        // Wrap join results — classify joined table (FR-4)
        if (
          (prop === "innerJoin" ||
            prop === "leftJoin" ||
            prop === "rightJoin" ||
            prop === "fullJoin") &&
          typeof val === "function"
        ) {
          return new Proxy(val, {
            apply(joinTarget, joinThis, joinArgs) {
              // joinArgs[0] is the joined table
              const joinedTable = joinArgs[0];
              if (joinedTable) {
                const joinedClass = classifyTable(joinedTable);
                if (joinedClass === "REFERENTIAL") {
                  const name = tableNameOf(joinedTable);
                  throw new TenantScopeError(
                    name,
                    "REFERENTIAL",
                    `[TenantDB] Joined table "${name}" is REFERENTIAL. ` +
                      `Cannot join through TenantDB. ` +
                      `Use tenantDb.unscoped("reason") for manual joins.`,
                  );
                }
                // FLAT joined tables: the join itself doesn't inject schoolId,
                // but subsequent .where() will scope both tables via the proxy.
                // We need to track that a FLAT table was joined so we can
                // inject its schoolId in the .where() interception.
              }
              const result = Reflect.apply(joinTarget, joinThis, joinArgs);
              return createProxy(result);
            },
          });
        }

        // Generic method wrapper: if the return value looks like a query
        // builder, wrap it so tenant context is preserved.
        // Skip "then" to avoid breaking Promise resolution.
        if (typeof val === "function" && prop !== "then") {
          return new Proxy(val, {
            apply(methodTarget, methodThis, methodArgs) {
              const result = Reflect.apply(
                methodTarget,
                methodThis,
                methodArgs,
              );
              if (
                result &&
                typeof result === "object" &&
                ("then" in result || "where" in result || "limit" in result)
              ) {
                return createProxy(result);
              }
              return result;
            },
          });
        }

        return val;
      },
    });
  }

  return createProxy(builder);
}

/**
 * Enforce schoolId on insert .values() for FLAT tables (FR-5).
 * - Single object: if schoolId is present and conflicts → throw; if missing → inject.
 * - Array of objects: same logic per element.
 * @param values - The values argument from .values()
 * @param tenantSchoolId - The tenant's schoolId
 * @returns The values with schoolId enforced/injected
 */
function enforceInsertValues(
  values: unknown,
  tenantSchoolId: string,
): unknown {
  if (Array.isArray(values)) {
    return values.map((row) => enforceSingleRow(row, tenantSchoolId));
  }
  return enforceSingleRow(values, tenantSchoolId);
}

function enforceSingleRow(row: unknown, tenantSchoolId: string): unknown {
  if (row && typeof row === "object" && !Array.isArray(row)) {
    const record = row as Record<string, unknown>;
    if ("schoolId" in record && record.schoolId !== undefined) {
      if (record.schoolId !== tenantSchoolId) {
        throw new TenantScopeError(
          "insert",
          "FLAT",
          `[TenantDB] Insert into FLAT table has conflicting schoolId: ` +
            `got "${record.schoolId}", expected "${tenantSchoolId}". ` +
            `Remove schoolId from the insert values to let TenantDB inject it.`,
        );
      }
      // schoolId matches — allow
      return row;
    }
    // schoolId missing — inject
    return { ...record, schoolId: tenantSchoolId };
  }
  return row;
}

/**
 * Wrap a raw Drizzle DB so that every select, update, and delete against a
 * FLAT table (one in the registry with `schoolId`) automatically includes
 * `eq(table.schoolId, tenant.schoolId)`.
 *
 * REFERENTIAL tables throw TenantScopeError — use `unscoped()` to access
 * the raw DB for manual owner-FK joins.
 *
 * ```ts
 * const tenantDb = createTenantDB(db, { schoolId: "s1" });
 * await tenantDb.select().from(classrooms).where(eq(classrooms.archived, false));
 * // WHERE "classrooms"."school_id" = 's1' AND "classrooms"."archived" = false
 * ```
 */
export function createTenantDB(db: DB, tenant: Tenant): TenantDB {
  const tenantDb = new Proxy(db, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);

      // Guard: db.query.* bypasses tenant scoping entirely.
      if (prop === "query") {
        throw new Error(
          "db.query is not available on TenantDB. " +
            "Use db.select(), db.update(), or db.delete() instead " +
            "to ensure tenant scoping is applied.",
        );
      }

      // Escape hatch: unscoped(reason) returns the raw db
      if (prop === "unscoped") {
        return (_reason: string) => target;
      }

      if (typeof val !== "function") {
        return val;
      }

      // Use a function proxy so properties like `.mock` remain accessible
      return new Proxy(val, {
        apply(fnTarget, fnThis, fnArgs) {
          // SELECT: intercept .from() to capture the table
          if (prop === "select") {
            const selectBuilder = fnTarget.apply(fnThis, fnArgs);
            return new Proxy(selectBuilder, {
              get(selectTarget, selectProp) {
                const selectVal = Reflect.get(selectTarget, selectProp);
                if (
                  selectProp === "from" &&
                  typeof selectVal === "function"
                ) {
                  return new Proxy(selectVal, {
                    apply(fromFn, fromThis, fromArgs) {
                      const table = fromArgs[0];
                      // Classify: FLAT → continue with proxy; EXEMPT → pass through; REFERENTIAL → throw
                      const cls = classifyTable(table);
                      if (cls === "REFERENTIAL") {
                        const name = tableNameOf(table);
                        throw new TenantScopeError(
                          name,
                          "REFERENTIAL",
                          `[TenantDB] Table "${name}" is REFERENTIAL (has no schoolId column). ` +
                            `Cannot select through TenantDB. ` +
                            `Use tenantDb.unscoped("reason") + a users.schoolId join.`,
                        );
                      }
                      // M-SF-2 fail-closed: FLAT operations require a tenant schoolId.
                      // Throws BEFORE invoking the underlying builder.
                      if (cls === "FLAT") {
                        requireTenantForFlat(tenant, table, "select");
                      }
                      const queryBuilder = fromFn.apply(fromThis, fromArgs);
                      // FLAT → wrap with tenant scoping; EXEMPT → return unwrapped
                      if (cls === "FLAT") {
                        return wrapQueryBuilder(queryBuilder, table, tenant);
                      }
                      return queryBuilder;
                    },
                  });
                }
                if (typeof selectVal === "function") {
                  return new Proxy(selectVal, {
                    apply(innerFn, innerThis, innerArgs) {
                      const result = innerFn.apply(innerThis, innerArgs);
                      if (
                        result &&
                        typeof result === "object" &&
                        ("then" in result || "where" in result)
                      ) {
                        return wrapQueryBuilder(result, null, tenant);
                      }
                      return result;
                    },
                  });
                }
                return selectVal;
              },
            });
          }

          // UPDATE: intercept .set() to capture the table
          if (prop === "update") {
            const table = fnArgs[0];
            const updateCls = requireScopableTable(table, "update");
            // M-SF-2 fail-closed: FLAT updates require a tenant schoolId.
            if (updateCls === "FLAT") {
              requireTenantForFlat(tenant, table, "update");
            }
            const updateBuilder = fnTarget.apply(fnThis, fnArgs);
            return new Proxy(updateBuilder, {
              get(updateTarget, updateProp) {
                const updateVal = Reflect.get(updateTarget, updateProp);
                if (updateProp === "set" && typeof updateVal === "function") {
                  return new Proxy(updateVal, {
                    apply(setFn, setThis, setArgs) {
                      const setBuilder = setFn.apply(setThis, setArgs);
                      return wrapQueryBuilder(setBuilder, table, tenant);
                    },
                  });
                }
                if (typeof updateVal === "function") {
                  return new Proxy(updateVal, {
                    apply(innerFn, innerThis, innerArgs) {
                      const result = innerFn.apply(innerThis, innerArgs);
                      if (
                        result &&
                        typeof result === "object" &&
                        ("then" in result || "where" in result)
                      ) {
                        return wrapQueryBuilder(result, table, tenant);
                      }
                      return result;
                    },
                  });
                }
                return updateVal;
              },
            });
          }

          // DELETE: direct wrap
          if (prop === "delete") {
            const table = fnArgs[0];
            const deleteCls = requireScopableTable(table, "delete");
            // M-SF-2 fail-closed: FLAT deletes require a tenant schoolId.
            if (deleteCls === "FLAT") {
              requireTenantForFlat(tenant, table, "delete");
            }
            const deleteBuilder = fnTarget.apply(fnThis, fnArgs);
            return wrapQueryBuilder(deleteBuilder, table, tenant);
          }

          // TRANSACTION: wrap the transaction callback so the tx is also a TenantDB
          if (prop === "transaction") {
            const fn = fnArgs[0] as (tx: DB) => Promise<unknown>;
            const options = fnArgs[1];
            return fnTarget.call(
              fnThis,
              (tx: DB) => {
                const tenantTx = createTenantDB(tx, tenant);
                return fn(tenantTx);
              },
              options,
            );
          }

          // INSERT: classify table, enforce schoolId on values for FLAT (FR-5)
          if (prop === "insert") {
            const table = fnArgs[0];
            const cls = classifyTable(table);
            if (cls === "REFERENTIAL") {
              const name = tableNameOf(table);
              throw new TenantScopeError(
                name,
                "REFERENTIAL",
                `[TenantDB] Table "${name}" is REFERENTIAL (has no schoolId column). ` +
                  `Cannot insert through TenantDB. ` +
                  `Use tenantDb.unscoped("reason") for manual inserts.`,
              );
            }
            // M-SF-2 fail-closed: FLAT inserts require a tenant schoolId.
            if (cls === "FLAT") {
              requireTenantForFlat(tenant, table, "insert");
            }
            const insertBuilder = fnTarget.apply(fnThis, fnArgs);
            return new Proxy(insertBuilder, {
              get(insertTarget, insertProp) {
                const insertVal = Reflect.get(insertTarget, insertProp);
                if (
                  insertProp === "values" &&
                  typeof insertVal === "function"
                ) {
                  return new Proxy(insertVal, {
                    apply(valuesFn, valuesThis, valuesArgs) {
                      // FR-5: enforce schoolId on FLAT inserts
                      if (cls === "FLAT" && tenant.schoolId) {
                        valuesArgs[0] = enforceInsertValues(
                          valuesArgs[0],
                          tenant.schoolId,
                        );
                      }
                      const valuesBuilder = valuesFn.apply(
                        valuesThis,
                        valuesArgs,
                      );
                      return new Proxy(valuesBuilder, {
                        get(vbTarget, vbProp) {
                          const vbVal = Reflect.get(vbTarget, vbProp);
                          if (
                            vbProp === "onConflictDoUpdate" &&
                            typeof vbVal === "function"
                          ) {
                            return new Proxy(vbVal, {
                              apply(
                                onConflictFn,
                                onConflictThis,
                                onConflictArgs,
                              ) {
                                const upsertBuilder = onConflictFn.apply(
                                  onConflictThis,
                                  onConflictArgs,
                                );
                                return wrapQueryBuilder(
                                  upsertBuilder,
                                  table,
                                  tenant,
                                );
                              },
                            });
                          }
                          if (typeof vbVal === "function") {
                            return new Proxy(vbVal, {
                              apply(innerFn, innerThis, innerArgs) {
                                const result = innerFn.apply(
                                  innerThis,
                                  innerArgs,
                                );
                                if (
                                  result &&
                                  typeof result === "object" &&
                                  ("then" in result || "where" in result)
                                ) {
                                  return wrapQueryBuilder(
                                    result,
                                    table,
                                    tenant,
                                  );
                                }
                                return result;
                              },
                            });
                          }
                          return vbVal;
                        },
                      });
                    },
                  });
                }
                if (typeof insertVal === "function") {
                  return new Proxy(insertVal, {
                    apply(innerFn, innerThis, innerArgs) {
                      const result = innerFn.apply(innerThis, innerArgs);
                      if (
                        result &&
                        typeof result === "object" &&
                        ("then" in result || "where" in result)
                      ) {
                        return wrapQueryBuilder(result, table, tenant);
                      }
                      return result;
                    },
                  });
                }
                return insertVal;
              },
            });
          }

          // Everything else (raw, etc.) passes through untouched
          return fnTarget.apply(fnThis, fnArgs);
        },
      });
    },
  }) as TenantDB;

  return tenantDb;
}
