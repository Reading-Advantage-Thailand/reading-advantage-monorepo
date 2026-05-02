import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LicenseType } from "@prisma/client";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@reading-advantage/auth";

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
  // Try NextAuth session first
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    return buildUserFromSession(session);
  }

  // Fallback: check for tRPC access token cookie
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("ra_access_token")?.value;
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
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

      if (user) {
        return buildUserFromDb(user);
      }
    }
  } catch {
    // Token invalid or expired — ignore
  }

  return null;
}

async function buildUserFromSession(session: any) {
  const userId = session.user.id;
  // ... existing logic moved to helper
  return buildUserFromDbInternal(userId);
}

async function buildUserFromDb(user: any) {
  return buildUserFromDbInternal(user.id, user);
}

async function buildUserFromDbInternal(userId: string, existingUser?: any) {
  let user = existingUser;
  if (!user) {
    user = await prisma.user.findUnique({
      where: { id: userId },
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
  }

  if (!user) return null;

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

  const isExpired = effectiveExpirationDate ? effectiveExpirationDate < currentDate : false;

  const licenseLevel = await getUserLicenseLevel(
    userId,
    activeLicenseId,
    effectiveExpirationDate
  );

  const teacherClassIds = user.teacherClassrooms.map((tc: any) => tc.classroomId);
  const studentClassIds = user.studentClassrooms.map((sc: any) => sc.classroomId);

  return {
    id: user.id,
    email: user.email!,
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
    teacher_class_ids: teacherClassIds.length > 0 ? teacherClassIds : undefined,
    student_class_ids: studentClassIds.length > 0 ? studentClassIds : undefined,
  };
}
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
          select: {
            licenseId: true,
          },
          take: 1,
        },
        // Fetch classroom associations for RBAC
        teacherClassrooms: {
          select: {
            classroomId: true,
          },
        },
        studentClassrooms: {
          select: {
            classroomId: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const currentDate = new Date();
    
    const activeLicenseId = user.licenseOnUsers[0]?.licenseId || user.licenseId;

    // Get the actual license expiration date if user has a license
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

    const isExpired = effectiveExpirationDate ? effectiveExpirationDate < currentDate : false;

    const licenseLevel = await getUserLicenseLevel(
      session.user.id,
      activeLicenseId,
      effectiveExpirationDate
    );

    // Extract classroom IDs for scope-based authorization
    const teacherClassIds = user.teacherClassrooms.map((tc) => tc.classroomId);
    const studentClassIds = user.studentClassrooms.map((sc) => sc.classroomId);

    return {
      id: user.id,
      email: user.email!,
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
      // School and classroom scope for RBAC
      school_id: user.schoolId ?? undefined,
      teacher_class_ids: teacherClassIds.length > 0 ? teacherClassIds : undefined,
      student_class_ids: studentClassIds.length > 0 ? studentClassIds : undefined,
    };
  } catch (error) {
    console.error("Error fetching current user:", error);
    return session.user;
  }
}
