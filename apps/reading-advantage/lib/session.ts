import { prisma } from "@/lib/prisma";
import { LicenseType } from "@prisma/client";
import { cookies } from "next/headers";
import { db } from "@reading-advantage/db";
import { validateSession } from "@reading-advantage/auth";

async function getUserLicenseLevel(
  userId: string,
  licenseId: string | null,
  expiredDate: Date | null
): Promise<LicenseType | "EXPIRED"> {
  try {
    if (licenseId) {
      const license = await prisma.license.findUnique({
        where: { id: licenseId },
        select: { licenseType: true },
      });
      return license?.licenseType || LicenseType.BASIC;
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

  // Enrich with reading-advantage specific data from Prisma
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        level: true,
        emailVerified: true,
        image: true,
        xp: true,
        cefrLevel: true,
        expiredDate: true,
        licenseId: true,
        onborda: true,
        schoolId: true,
        licenseOnUsers: {
          select: { licenseId: true },
          take: 1,
        },
        teacherClassrooms: { select: { classroomId: true } },
        studentClassrooms: { select: { classroomId: true } },
      },
    });

    if (!user) {
      return null;
    }

    const currentDate = new Date();
    const activeLicenseId = user.licenseOnUsers[0]?.licenseId || user.licenseId;

    let effectiveExpirationDate = user.expiredDate;
    if (activeLicenseId) {
      const activeLicense = await prisma.license.findUnique({
        where: { id: activeLicenseId },
        select: { expiresAt: true },
      });
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

    const teacherClassIds = user.teacherClassrooms.map(
      (tc: any) => tc.classroomId
    );
    const studentClassIds = user.studentClassrooms.map(
      (sc: any) => sc.classroomId
    );

    return {
      id: user.id,
      username: session.user.username ?? user.email ?? "",
      email: user.email ?? "",
      display_name: user.name ?? "",
      role: user.role,
      level: user.level,
      email_verified: !!user.emailVerified,
      picture: user.image ?? "",
      xp: user.xp,
      cefr_level: user.cefrLevel ?? "",
      expired_date: effectiveExpirationDate?.toISOString() ?? "",
      expired: isExpired,
      license_id: activeLicenseId ?? "",
      license_level: licenseLevel,
      onborda: user.onborda ?? false,
      school_id: user.schoolId ?? undefined,
      teacher_class_ids:
        teacherClassIds.length > 0 ? teacherClassIds : undefined,
      student_class_ids:
        studentClassIds.length > 0 ? studentClassIds : undefined,
    };
  } catch (error) {
    console.error("Error fetching user from database:", error);
    return null;
  }
}
