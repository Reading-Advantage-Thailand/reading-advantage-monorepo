import { db } from "@reading-advantage/db";
import { and, eq, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { canSetPasswordFor, effectiveRoleOf } from "@/lib/authorization";
import { hasOwnSchoolAdminRow } from "@/lib/permissions";
import {
  users,
  schools,
  userRoles,
  roles,
  schoolAdmins,
} from "@reading-advantage/db";

// Type definitions for user with roles
export interface UserWithRoles {
  id: string;
  email: string | null;
  schoolId: string | null;
  level: number;
  /** The users.role session role, when the loader provided it. */
  role?: string | null;
  roles: Array<{
    role: {
      id: string;
      name: string;
    };
  }>;
  SchoolAdmins: Array<{
    id: string;
    schoolId: string;
  }>;
}

// Validate user and return user with roles
export const validateUser = async (
  userId: string,
): Promise<UserWithRoles | null> => {
  try {

    const userRows = await db.select({
      id: users.id,
      email: users.email,
      schoolId: users.schoolId,
      level: users.level,
      role: users.role,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userRow = userRows[0];
    if (!userRow) {
      return null;
    }

    // Roles: join userRoles ⨝ roles
    const userRoleRows = await db.select({
      roleId: userRoles.roleId,
      role: {
        id: roles.id,
        name: roles.name,
      },
    })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    const rolesNested = userRoleRows.map((row) => ({ role: row.role }));

    // SchoolAdmins: filter by userId
    const schoolAdminRows = await db.select({
      id: schoolAdmins.id,
      schoolId: schoolAdmins.schoolId,
    })
      .from(schoolAdmins)
      .where(eq(schoolAdmins.userId, userId));

    const userWithRoles: UserWithRoles = {
      id: userRow.id,
      email: userRow.email,
      schoolId: userRow.schoolId,
      level: userRow.level,
      role: userRow.role,
      roles: rolesNested,
      SchoolAdmins: schoolAdminRows,
    };


    return userWithRoles;
  } catch (error) {
    console.error("Auth Utils: Error validating user:", error);
    return null;
  }
};

/** The caller fields that scope and rank checks read. */
export type CallerScope = Pick<UserWithRoles, "schoolId" | "role" | "roles" | "SchoolAdmins">;

/**
 * Resolves the effective management role of a caller.
 * The users.role session role wins; legacy role rows fill in when it is absent.
 * @param userWithRoles The caller loaded by validateUser.
 * @returns SYSTEM, ADMIN, TEACHER, or an empty string.
 */
export function effectiveCallerRole(userWithRoles: CallerScope): string {
  const sessionRole = String(userWithRoles.role ?? "").toUpperCase();
  if (sessionRole) return sessionRole;
  const names = userWithRoles.roles.map((r) => r.role.name);
  if (names.includes("system")) return "SYSTEM";
  if (names.includes("admin") || hasOwnSchoolAdminRow(userWithRoles)) return "ADMIN";
  if (names.includes("teacher")) return "TEACHER";
  return "";
}

/**
 * Resolves the effective rank of a loaded caller for password and delete rank checks.
 * Unlike effectiveCallerRole, the highest of users.role, legacy role rows,
 * and school_admins rows wins. A school_admins row counts only for the caller's own school.
 * @param userWithRoles The caller loaded by validateUser.
 * @returns SYSTEM, ADMIN, TEACHER, STUDENT, or an empty string.
 */
export function callerEffectiveRank(userWithRoles: CallerScope): string {
  return effectiveRoleOf(
    userWithRoles.role,
    userWithRoles.roles.map((r) => r.role.name),
    hasOwnSchoolAdminRow(userWithRoles),
  );
}

/**
 * Loads the effective rank of a target account from its legacy role and school_admins rows.
 * An unrecognized legacy role name counts as the highest rank, so such a target is never writable.
 * @param userId The account to rank.
 * @param sessionRole The users.role value the caller already read for this account.
 * @param unknownNames How to treat an unrecognized legacy name; "max" (default) fits a target, "ignore" fits an actor.
 * @param adminSchoolId When set, only a school_admins row of this school counts (use it for an actor); null counts no row. Leave it undefined for a target so every row counts.
 * @returns The effective role of the account.
 */
export async function loadTargetEffectiveRank(
  userId: string,
  sessionRole: string | null | undefined,
  unknownNames: "ignore" | "max" = "max",
  adminSchoolId?: string | null,
): Promise<string> {
  const legacy = await db.select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));
  const adminRows = adminSchoolId === null
    ? []
    : await db.select({ id: schoolAdmins.id })
      .from(schoolAdmins)
      .where(
        adminSchoolId === undefined
          ? eq(schoolAdmins.userId, userId)
          : and(eq(schoolAdmins.userId, userId), eq(schoolAdmins.schoolId, adminSchoolId)),
      )
      .limit(1);
  const adminRow = adminRows[0];
  return effectiveRoleOf(sessionRole, legacy.map((r) => r.name), Boolean(adminRow), unknownNames);
}

/** The account facts the reset decision reads. */
interface ResetPrincipal {
  id: string;
  role: string;
  schoolId: string | null;
}

/**
 * Decides whether a session actor may reset the password of a target account.
 * Both accounts must belong to the same school, and a school-less account never matches.
 * The actor must outrank the target by effective rank, legacy rows included.
 * @param actor The session user who asks for the reset.
 * @param target The account whose password would change.
 * @returns True when the reset is allowed.
 */
export async function authorizeResetTarget(
  actor: ResetPrincipal,
  target: ResetPrincipal,
): Promise<boolean> {
  if (!actor.schoolId || !target.schoolId || actor.schoolId !== target.schoolId) return false;
  const actorRank = await loadTargetEffectiveRank(actor.id, actor.role, "ignore", actor.schoolId);
  const targetRank = await loadTargetEffectiveRank(target.id, target.role);
  return canSetPasswordFor(actorRank, targetRank);
}

/**
 * Builds the school scope conditions for a management query.
 * SYSTEM callers are unrestricted. Everyone else is limited to their own school,
 * and a caller without a school sees nothing (fail closed).
 * @param schoolColumn The schoolId column of the queried table.
 * @param userWithRoles The caller loaded by validateUser.
 * @returns Conditions to spread into a where clause.
 */
export function schoolScopeConditions(
  schoolColumn: AnyColumn,
  userWithRoles: CallerScope,
): SQL[] {
  if (effectiveCallerRole(userWithRoles) === "SYSTEM") return [];
  if (!userWithRoles.schoolId) return [sql`false`];
  return [eq(schoolColumn, userWithRoles.schoolId)];
}

// Check if user has admin permissions
export const checkAdminPermissions = async (
  userWithRoles: UserWithRoles,
): Promise<boolean> => {
  try {
    // Check if user has system or admin role
    const isSystemAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "system",
    );

    const isAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "admin",
    );

    // Check if user is a school admin
    const isSchoolAdmin = hasOwnSchoolAdminRow(userWithRoles);

    // The users.role session role is authoritative; legacy rows are additive.
    const sessionRole = String(userWithRoles.role ?? "").toUpperCase();
    const isSessionAdmin = sessionRole === "ADMIN" || sessionRole === "SYSTEM";

    const hasPermission = isSystemAdmin || isAdmin || isSchoolAdmin || isSessionAdmin;

    return hasPermission;
  } catch (error) {
    console.error("Auth Utils: Error checking admin permissions:", error);
    return false;
  }
};

// Check if user has teacher permissions
export const checkTeacherPermissions = async (
  userWithRoles: UserWithRoles,
): Promise<boolean> => {
  try {
    // Check if user has teacher role or higher
    const isTeacher = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "teacher" ||
        userRole.role.name === "admin" ||
        userRole.role.name === "system",
    );

    // Check if user is a school admin (can also manage teachers/students)
    const isSchoolAdmin = hasOwnSchoolAdminRow(userWithRoles);

    const hasPermission = isTeacher || isSchoolAdmin;

    return hasPermission;
  } catch (error) {
    console.error("Auth Utils: Error checking teacher permissions:", error);
    return false;
  }
};

// Check if user has student permissions
export const checkStudentPermissions = async (
  userWithRoles: UserWithRoles,
): Promise<boolean> => {
  try {
    // Students can only access their own data, but admins and teachers can access student data
    const hasHigherPermissions = userWithRoles.roles.some(
      (userRole) =>
        userRole.role.name === "teacher" ||
        userRole.role.name === "admin" ||
        userRole.role.name === "system",
    );

    const isStudent = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "student",
    );

    const isSchoolAdmin = hasOwnSchoolAdminRow(userWithRoles);

    const hasPermission = hasHigherPermissions || isStudent || isSchoolAdmin;

    return hasPermission;
  } catch (error) {
    console.error("Auth Utils: Error checking student permissions:", error);
    return false;
  }
};

// Get user's accessible school IDs
export const getUserSchoolIds = async (
  userWithRoles: UserWithRoles,
): Promise<string[]> => {
  try {
    // System admins can access all schools
    const isSystemAdmin = userWithRoles.roles.some(
      (userRole) => userRole.role.name === "system",
    );

    if (isSystemAdmin) {
      const allSchools = await db.select({ id: schools.id }).from(schools);
      const schoolIds = allSchools.map((school) => school.id);

      return schoolIds;
    }

    // School admins can only access their assigned school
    const schoolIds: string[] = [];

    if (userWithRoles.schoolId) {
      schoolIds.push(userWithRoles.schoolId);
    }

    // A school_admins row for another school grants no access here.
    return schoolIds;
  } catch (error) {
    console.error("Auth Utils: Error getting user school IDs:", error);
    return [];
  }
};

// Validate if user can access specific school
export const canAccessSchool = async (
  userWithRoles: UserWithRoles,
  schoolId: string,
): Promise<boolean> => {
  try {
    const accessibleSchoolIds = await getUserSchoolIds(userWithRoles);
    const hasAccess = accessibleSchoolIds.includes(schoolId);

    return hasAccess;
  } catch (error) {
    console.error("Auth Utils: Error checking school access:", error);
    return false;
  }
};

export const getUserRoles = async (userId: string): Promise<string[]> => {
  const userRows = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userRows[0]) {
    return [];
  }

  const roleRows = await db.select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));

  return roleRows.map((row) => row.name);
};