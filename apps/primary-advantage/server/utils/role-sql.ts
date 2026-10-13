import { eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { db } from "@reading-advantage/db";
import { users, roles, userRoles, schoolAdmins } from "@reading-advantage/db/schema";

/** A database handle or a transaction handle. */
export type RoleExecutor = Pick<typeof db, "select" | "insert" | "update" | "delete">;

/**
 * Builds the condition that selects users by role name.
 * `users.role` is authoritative, because migrated accounts have no `user_roles` row.
 * A legacy or new `user_roles` row with a matching role name also counts.
 * @param roleNames One role name or a list of role names, in any letter case.
 * @returns A SQL condition to use in a where clause on the `users` table.
 */
export function roleSql(roleNames: string | string[]): SQL {
  const names = (Array.isArray(roleNames) ? roleNames : [roleNames]).map((n) => n.toLowerCase());
  const upper = sql.join(names.map((n) => sql`${n.toUpperCase()}`), sql`, `);
  const lower = sql.join(names.map((n) => sql`${n}`), sql`, `);
  return sql`(${users.role}::text IN (${upper}) OR exists (select 1 from ${userRoles} inner join ${roles} on ${roles.id} = ${userRoles.roleId} where ${userRoles.userId} = ${users.id} and ${roles.name} IN (${lower})))`;
}

/**
 * Sets the role of one user.
 * It always writes `users.role` and clears the old `user_roles` rows, because `users.role` is the truth.
 * It inserts a new `user_roles` row only when the `roles` row exists.
 * A role below ADMIN also deletes the `school_admins` rows, so the user loses the admin API rights.
 * It never fails when the `roles` table is empty.
 * @param tx A database or transaction handle.
 * @param userId The user to change.
 * @param role The new role name, in any letter case.
 */
export async function setUserRole(tx: RoleExecutor, userId: string, role: string): Promise<void> {
  const upper = role.toUpperCase();
  await tx.update(users).set({ role: upper as typeof users.$inferInsert.role }).where(eq(users.id, userId));
  await tx.delete(userRoles).where(eq(userRoles.userId, userId));
  if (upper !== "ADMIN" && upper !== "SYSTEM") {
    await tx.delete(schoolAdmins).where(eq(schoolAdmins.userId, userId));
  }
  const [row] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.name, role.toLowerCase())).limit(1);
  if (!row) return;
  await tx.insert(userRoles).values({ userId, roleId: row.id });
}
