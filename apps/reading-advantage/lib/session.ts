import { cookies } from "next/headers";
import { db, eq } from "@reading-advantage/db";
import {
  users,
  licenses,
  licenseOnUsers,
  classroomTeachers,
  classroomStudents,
} from "@reading-advantage/db/schema";
import { validateSession } from "@reading-advantage/auth";
import { z } from "zod";
import { LicenseType, Role } from "@/lib/enums";

export const sessionUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().optional().or(z.literal("")),
  display_name: z.string(),
  role: z.nativeEnum(Role),
  level: z.number().nullable(),
  email_verified: z.boolean(),
  picture: z.string(),
  xp: z.number().nullable(),
  cefr_level: z.string(),
  expired_date: z.string(),
  expired: z.boolean(),
  license_id: z.string(),
  license_level: z.union([z.nativeEnum(LicenseType), z.literal("EXPIRED")]),
  onborda: z.boolean(),
  school_id: z.string().optional(),
  teacher_class_ids: z.array(z.string()).optional(),
  student_class_ids: z.array(z.string()).optional(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

async function getUserLicenseLevel(
  _userId: string,
  licenseId: string | null,
  expiredDate: Date | null
): Promise<LicenseType | "EXPIRED"> {
  try {
    if (licenseId) {
      const [license] = await db
        .select({ licenseType: licenses.licenseType })
        .from(licenses)
        .where(eq(licenses.id, licenseId))
        .limit(1);
      return ((license?.licenseType as LicenseType | undefined) ?? LicenseType.BASIC);
    }

    if (!expiredDate) {
      return LicenseType.ENTERPRISE;
    }

    const now = new Date();
    if (expiredDate > now) {
      return LicenseType.ENTERPRISE;
    } else {
      return "EXPIRED";
    }
  } catch (error) {
    console.error("Error getting user license level:", error);
    return LicenseType.BASIC;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (!token) {
    return null;
  }

  // Validate session using the shared auth package (Drizzle)
  const session = await validateSession(db, token);
  if (!session) {
    return null;
  }

  // Enrich with reading-advantage specific data via Drizzle
  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        level: users.level,
        image: users.image,
        xp: users.xp,
        cefrLevel: users.cefrLevel,
        expiredDate: users.expiredDate,
        licenseId: users.licenseId,
        schoolId: users.schoolId,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return null;
    }

    // Note: `emailVerified` and `onborda` columns are not (yet) on the unified
    // Drizzle users schema — default sensibly. Reading-advantage's session
    // implies the user already authenticated, so treat email as verified.
    const emailVerified = true;
    const onborda = false;

    const [licenseLink] = await db
      .select({ licenseId: licenseOnUsers.licenseId })
      .from(licenseOnUsers)
      .where(eq(licenseOnUsers.userId, user.id))
      .limit(1);

    const teacherClassroomRows = await db
      .select({ classroomId: classroomTeachers.classroomId })
      .from(classroomTeachers)
      .where(eq(classroomTeachers.teacherId, user.id));

    const studentClassroomRows = await db
      .select({ classroomId: classroomStudents.classroomId })
      .from(classroomStudents)
      .where(eq(classroomStudents.studentId, user.id));

    const currentDate = new Date();
    const activeLicenseId = licenseLink?.licenseId ?? user.licenseId ?? null;

    let effectiveExpirationDate: Date | null = user.expiredDate ?? null;
    if (activeLicenseId) {
      const [activeLicense] = await db
        .select({ expiresAt: licenses.expiresAt })
        .from(licenses)
        .where(eq(licenses.id, activeLicenseId))
        .limit(1);
      if (activeLicense?.expiresAt) {
        effectiveExpirationDate = activeLicense.expiresAt;
      }
    }

    const isExpired = effectiveExpirationDate
      ? effectiveExpirationDate < currentDate
      : false;

    const licenseLevel = await getUserLicenseLevel(
      session.user.id,
      activeLicenseId,
      effectiveExpirationDate
    );

    const teacherClassIds = teacherClassroomRows.map((tc) => tc.classroomId);
    const studentClassIds = studentClassroomRows.map((sc) => sc.classroomId);

    const sessionUser = sessionUserSchema.parse({
      id: user.id,
      username: session.user.username ?? user.email ?? "",
      email: user.email ?? "",
      display_name: user.name ?? "",
      role: user.role,
      level: user.level,
      email_verified: emailVerified,
      picture: user.image ?? "",
      xp: user.xp,
      cefr_level: user.cefrLevel ?? "",
      expired_date: effectiveExpirationDate?.toISOString() ?? "",
      expired: isExpired,
      license_id: activeLicenseId ?? "",
      license_level: licenseLevel,
      onborda,
      school_id: user.schoolId ?? undefined,
      teacher_class_ids:
        teacherClassIds.length > 0 ? teacherClassIds : undefined,
      student_class_ids:
        studentClassIds.length > 0 ? studentClassIds : undefined,
    });

    return sessionUser;
  } catch (error) {
    console.error("Error fetching user from database:", error);
    return null;
  }
}
