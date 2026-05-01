import { prisma } from "@/lib/prisma";

// Type definitions for user with roles
export interface UserWithRoles {
  id: string;
  email: string | null;
  schoolId: string | null;
  level: number;
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
    // console.log("Auth Utils: Validating user:", userId);

    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        schoolId: true,
        level: true,
        roles: {
          include: {
            role: true,
          },
        },
        SchoolAdmins: true,
      },
    });

    if (!userWithRoles) {
      // console.log("Auth Utils: User not found:", userId);
      return null;
    }

    // console.log("Auth Utils: User validated:", {
    //   id: userWithRoles.id,
    //   email: userWithRoles.email,
    //   roles: userWithRoles.roles.map((r) => r.role.name),
    //   schoolAdmins: userWithRoles.SchoolAdmins.length,
    //   schoolId: userWithRoles.schoolId,
    // });

    return userWithRoles;
  } catch (error) {
    console.error("Auth Utils: Error validating user:", error);
    return null;
  }
};

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
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

    const hasPermission = isSystemAdmin || isAdmin || isSchoolAdmin;

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
    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

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

    const isSchoolAdmin = userWithRoles.SchoolAdmins.length > 0;

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
      const allSchools = await prisma.school.findMany({
        select: { id: true },
      });
      const schoolIds = allSchools.map((school) => school.id);

      return schoolIds;
    }

    // School admins can only access their assigned school
    const schoolIds: string[] = [];

    if (userWithRoles.schoolId) {
      schoolIds.push(userWithRoles.schoolId);
    }

    // Add schools where user is a school admin
    const adminSchoolIds = userWithRoles.SchoolAdmins.map(
      (admin) => admin.schoolId,
    );
    adminSchoolIds.forEach((schoolId) => {
      if (!schoolIds.includes(schoolId)) {
        schoolIds.push(schoolId);
      }
    });

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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: { include: { role: true } } },
  });
  return user?.roles.map((role) => role.role.name) || [];
};
