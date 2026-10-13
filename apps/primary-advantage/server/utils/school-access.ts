import { normalizeRole } from "@/lib/authorization";

/** The account facts that the school management rule reads. */
export interface SchoolActor {
  id: string;
  role: string | null | undefined;
  schoolId: string | null | undefined;
  /** True when the account holds a `school_admins` row for its own school. */
  hasSchoolAdminRow?: boolean;
}

/**
 * Decides if an account may manage one school (rename it, manage its admins).
 * The owner, an ADMIN or a holder of a `school_admins` row of the same school (by `users.role` and `users.school_id`), and SYSTEM may.
 * Migrated data has ADMIN users without a `school_admins` row and schools without an owner,
 * so the owner rule alone locks them out.
 * @param actor The account, read from the `users` row.
 * @param school The school to manage.
 * @returns True when the account may manage the school.
 */
export function canManageSchool(
  actor: SchoolActor,
  school: { id: string; ownerId: string | null | undefined },
): boolean {
  const role = normalizeRole(actor.role);
  if (role === "SYSTEM") return true;
  if (school.ownerId && school.ownerId === actor.id) return true;
  const sameSchool = !!actor.schoolId && actor.schoolId === school.id;
  return (role === "ADMIN" || !!actor.hasSchoolAdminRow) && sameSchool;
}
