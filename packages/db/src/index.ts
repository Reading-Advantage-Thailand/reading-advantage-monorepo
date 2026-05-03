export { db } from "./client.js";
export type { DB } from "./client.js";
export * from "./schema/index.js";
// Re-export drizzle-orm operators so consumers use the same drizzle-orm instance
export { eq, and, or, not, like, ilike, gt, gte, lt, lte, ne, isNull, isNotNull, inArray, notInArray, between, exists, asc, desc, sql, count, sum, avg, max, min } from "drizzle-orm";
export type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
