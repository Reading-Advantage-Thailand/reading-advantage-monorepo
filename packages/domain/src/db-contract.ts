import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import type { Tenant } from "@reading-advantage/auth";

// ─── TenantDB ─────────────────────────────────────────────

/**
 * Brand type for a DB instance that automatically injects tenant scoping
 * into select, update, and delete operations for tables that have a
 * `schoolId` column.
 */
export interface TenantDB extends DB {
  readonly __tenantBrand: true;
}

function hasSchoolId(table: unknown): table is { schoolId: unknown } {
  return (
    table !== null &&
    typeof table === "object" &&
    "schoolId" in table &&
    (table as Record<string, unknown>).schoolId !== undefined
  );
}

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

        // Intercept .then / .execute to inject if .where() was never called
        if ((prop === "then" || prop === "execute") && !state.whereCalled) {
          if (hasSchoolId(table) && tenant.schoolId) {
            const tenantCondition = eq(
              (table as { schoolId: SQL<unknown> }).schoolId,
              tenant.schoolId
            );
            const newBuilder = ((target as Record<string, unknown>)[
              "where"
            ] as Function).call(target, tenantCondition);
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
  return new Proxy(db, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);

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
            return fnTarget.call(fnThis, (tx: DB) => {
              const tenantTx = createTenantDB(tx, tenant);
              return fn(tenantTx);
            });
          }

          // Everything else (insert, raw, etc.) passes through untouched
          return fnTarget.apply(fnThis, fnArgs);
        },
      });
    },
  }) as TenantDB;
}
