import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import type { Tenant } from "@reading-advantage/auth";

// ─── TenantDB ─────────────────────────────────────────────

/**
 * Brand type for a DB instance that automatically injects tenant scoping
 * into select, update, and delete operations for tables that have a
 * `schoolId` column.
 *
 * The relational query API (`db.query.*`) is intercepted at runtime and
 * will throw if accessed through a TenantDB instance. Always use the
 * standard query builder (`db.select()`, `db.update()`, `db.delete()`)
 * with TenantDB.
 */
export interface TenantDB extends DB {
  readonly __tenantBrand: true;
}

/**
 * Type guard that checks if an object has a defined schoolId property.
 * @param table - The object to check
 * @returns True if the object has a defined schoolId property
 */
function hasSchoolId(table: unknown): table is { schoolId: unknown } {
  return (
    table !== null &&
    typeof table === "object" &&
    "schoolId" in table &&
    (table as Record<string, unknown>).schoolId !== undefined
  );
}

/**
 * Wraps a Drizzle query builder with automatic schoolId tenant scoping. Intercepts
 * .where() calls to inject tenant conditions and ensures unscoped queries are scoped
 * before execution.
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

              if (hasSchoolId(table) && tenant.schoolId) {
                const tenantCondition = eq(
                  (table as { schoolId: SQL<unknown> }).schoolId,
                  tenant.schoolId
                );
                const newCondition = userCondition
                  ? and(tenantCondition, userCondition)
                  : tenantCondition;
                return createProxy(
                  Reflect.apply(whereTarget, whereThis, [newCondition])
                );
              }

              return createProxy(
                Reflect.apply(whereTarget, whereThis, [userCondition])
              );
            },
          });
        }

        // Intercept .then / .execute / .toSQL / .prepare to inject if .where() was never called
        if (
          (prop === "then" || prop === "execute" || prop === "toSQL" || prop === "prepare") &&
          !state.whereCalled
        ) {
          if (hasSchoolId(table) && tenant.schoolId) {
            const tenantCondition = eq(
              (table as { schoolId: SQL<unknown> }).schoolId,
              tenant.schoolId
            );
            const newBuilder = ((target as Record<string, unknown>)[
              "where"
            ] as (...args: unknown[]) => unknown).call(target, tenantCondition);
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

        // Wrap join results so subsequent .where() also injects
        if (
          (prop === "innerJoin" ||
            prop === "leftJoin" ||
            prop === "rightJoin" ||
            prop === "fullJoin") &&
          typeof val === "function"
        ) {
          return new Proxy(val, {
            apply(joinTarget, joinThis, joinArgs) {
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
                methodArgs
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
 * Wrap a raw Drizzle DB so that every select, update, and delete against a
 * tenant-scoped table (one that exposes a `schoolId` column) automatically
 * includes `eq(table.schoolId, tenant.schoolId)`.
 *
 * ```ts
 * const tenantDb = createTenantDB(db, { schoolId: "s1" });
 * await tenantDb.select().from(classrooms).where(eq(classrooms.archived, false));
 * // WHERE "classrooms"."school_id" = 's1' AND "classrooms"."archived" = false
 * ```
 */
export function createTenantDB(db: DB, tenant: Tenant): TenantDB {
  if (!tenant.schoolId) {
    console.warn(
      "[TenantDB] Created with null/undefined schoolId — tenant scoping will not be applied. " +
        "Domain functions using this DB instance against tenant-scoped tables will query across ALL schools."
    );
  }

  return new Proxy(db, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);

      // Guard: db.query.* bypasses tenant scoping entirely.
      // Throw at runtime so it cannot be used accidentally with TenantDB.
      if (prop === "query") {
        throw new Error(
          "db.query is not available on TenantDB. " +
            "Use db.select(), db.update(), or db.delete() instead " +
            "to ensure tenant scoping is applied."
        );
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
                      const queryBuilder = fromFn.apply(fromThis, fromArgs);
                      return wrapQueryBuilder(queryBuilder, table, tenant);
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
            const deleteBuilder = fnTarget.apply(fnThis, fnArgs);
            return wrapQueryBuilder(deleteBuilder, table, tenant);
          }

          // TRANSACTION: wrap the transaction callback so the tx is also a TenantDB
          if (prop === "transaction") {
            const fn = fnArgs[0] as (tx: DB) => Promise<unknown>;
            const options = fnArgs[1];
            return fnTarget.call(fnThis, (tx: DB) => {
              const tenantTx = createTenantDB(tx, tenant);
              return fn(tenantTx);
            }, options);
          }

          // INSERT: wrap .onConflictDoUpdate().where() for tenant scoping
          if (prop === "insert") {
            const table = fnArgs[0];
            const insertBuilder = fnTarget.apply(fnThis, fnArgs);
            return new Proxy(insertBuilder, {
              get(insertTarget, insertProp) {
                const insertVal = Reflect.get(insertTarget, insertProp);
                if (insertProp === "values" && typeof insertVal === "function") {
                  return new Proxy(insertVal, {
                    apply(valuesFn, valuesThis, valuesArgs) {
                      const valuesBuilder = valuesFn.apply(valuesThis, valuesArgs);
                      return new Proxy(valuesBuilder, {
                        get(vbTarget, vbProp) {
                          const vbVal = Reflect.get(vbTarget, vbProp);
                          if (vbProp === "onConflictDoUpdate" && typeof vbVal === "function") {
                            return new Proxy(vbVal, {
                              apply(onConflictFn, onConflictThis, onConflictArgs) {
                                const upsertBuilder = onConflictFn.apply(onConflictThis, onConflictArgs);
                                return wrapQueryBuilder(upsertBuilder, table, tenant);
                              },
                            });
                          }
                          if (typeof vbVal === "function") {
                            return new Proxy(vbVal, {
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
}
