import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Isolation check result
 */
export interface IsolationCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verify that a license is a demo license
 */
export async function verifyDemoLicense(licenseId: string): Promise<boolean> {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { school: true },
  });

  if (!license) {
    return false;
  }

  // Check if this is the demo license (school name contains "Reading Advantage Academy")
  return license.school?.name === "Reading Advantage Academy";
}

/**
 * Verify that a school is a demo school
 */
export async function verifyDemoSchool(schoolId: string): Promise<boolean> {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!school) {
    return false;
  }

  return school.name === "Reading Advantage Academy";
}

/**
 * Get demo license and school IDs
 */
export async function getDemoIds(): Promise<{
  licenseId: string;
  schoolId: string;
} | null> {
  const school = await prisma.school.findFirst({
    where: { name: "Reading Advantage Academy" },
    include: { licenses: true },
  });

  if (!school || school.licenses.length === 0) {
    return null;
  }

  return {
    schoolId: school.id,
    licenseId: school.licenses[0].id,
  };
}

/**
 * Check that all demo users belong to demo license/school only
 */
export async function checkDemoUsersBelongToDemoLicense(
  demoLicenseId: string,
  demoSchoolId: string
): Promise<IsolationCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find all users with demo emails
  const demoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: "demo-student" } },
        { email: { contains: "demo-teacher" } },
        { email: { contains: "demo-admin" } },
      ],
    },
  });

  // Check each demo user
  for (const user of demoUsers) {
    if (user.licenseId !== demoLicenseId) {
      errors.push(
        `Demo user ${user.email} (${user.id}) has wrong licenseId: ${user.licenseId} (expected: ${demoLicenseId})`
      );
    }

    if (user.schoolId !== demoSchoolId) {
      errors.push(
        `Demo user ${user.email} (${user.id}) has wrong schoolId: ${user.schoolId} (expected: ${demoSchoolId})`
      );
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check that demo classes have only demo users
 */
export async function checkDemoClassesHaveOnlyDemoUsers(
  demoSchoolId: string,
  demoLicenseId: string
): Promise<IsolationCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all demo classrooms
  const demoClassrooms = await prisma.classroom.findMany({
    where: { schoolId: demoSchoolId },
    include: {
      students: {
        include: {
          student: true,
        },
      },
    },
  });

  // Check each classroom's students
  for (const classroom of demoClassrooms) {
    for (const classroomStudent of classroom.students) {
      const student = classroomStudent.student;

      if (student.licenseId !== demoLicenseId) {
        errors.push(
          `Demo classroom ${classroom.classroomName} (${classroom.id}) contains non-demo student: ${student.email} (${student.id})`
        );
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check that no non-demo data appears in demo license/school
 */
export async function checkCrossLicenseData(
  demoLicenseId: string,
  demoSchoolId: string
): Promise<IsolationCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for non-demo users in demo school
  const nonDemoUsersInDemoSchool = await prisma.user.findMany({
    where: {
      schoolId: demoSchoolId,
      licenseId: { not: demoLicenseId },
    },
  });

  if (nonDemoUsersInDemoSchool.length > 0) {
    errors.push(
      `Found ${nonDemoUsersInDemoSchool.length} non-demo users in demo school: ${nonDemoUsersInDemoSchool.map((u) => u.email).join(", ")}`
    );
  }

  // Check for demo users in non-demo schools
  const demoUsersInNonDemoSchools = await prisma.user.findMany({
    where: {
      licenseId: demoLicenseId,
      schoolId: { not: demoSchoolId },
    },
  });

  if (demoUsersInNonDemoSchools.length > 0) {
    errors.push(
      `Found ${demoUsersInNonDemoSchools.length} demo users in non-demo schools: ${demoUsersInNonDemoSchools.map((u) => u.email).join(", ")}`
    );
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check that demo activities are isolated
 */
export async function checkDemoActivitiesIsolation(
  demoLicenseId: string,
  checkDate?: Date
): Promise<IsolationCheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all demo users
  const demoUsers = await prisma.user.findMany({
    where: { licenseId: demoLicenseId },
    select: { id: true },
  });

  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length === 0) {
    warnings.push("No demo users found");
    return { passed: true, errors, warnings };
  }

  // Build where clause for activities
  const whereClause: any = {
    userId: { in: demoUserIds },
  };

  if (checkDate) {
    whereClause.createdAt = { gte: checkDate };
  }

  // Check UserActivity
  const userActivities = await prisma.userActivity.findMany({
    where: whereClause,
    include: { user: true },
  });

  for (const activity of userActivities) {
    if (activity.user.licenseId !== demoLicenseId) {
      errors.push(
        `UserActivity ${activity.id} belongs to user ${activity.user.email} with wrong licenseId: ${activity.user.licenseId}`
      );
    }
  }

  // Check XPLog
  const xpLogs = await prisma.xPLog.findMany({
    where: whereClause,
    include: { user: true },
  });

  for (const log of xpLogs) {
    if (log.user.licenseId !== demoLicenseId) {
      errors.push(
        `XPLog ${log.id} belongs to user ${log.user.email} with wrong licenseId: ${log.user.licenseId}`
      );
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run all isolation checks
 */
export async function runAllIsolationChecks(
  demoLicenseId: string,
  demoSchoolId: string
): Promise<IsolationCheckResult> {
  console.log("🔒 Running isolation checks...");

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Check 1: Demo users belong to demo license
  console.log("  ✓ Checking demo users...");
  const usersCheck = await checkDemoUsersBelongToDemoLicense(
    demoLicenseId,
    demoSchoolId
  );
  allErrors.push(...usersCheck.errors);
  allWarnings.push(...usersCheck.warnings);

  // Check 2: Demo classes have only demo users
  console.log("  ✓ Checking demo classes...");
  const classesCheck = await checkDemoClassesHaveOnlyDemoUsers(
    demoSchoolId,
    demoLicenseId
  );
  allErrors.push(...classesCheck.errors);
  allWarnings.push(...classesCheck.warnings);

  // Check 3: No cross-license data
  console.log("  ✓ Checking cross-license data...");
  const crossLicenseCheck = await checkCrossLicenseData(
    demoLicenseId,
    demoSchoolId
  );
  allErrors.push(...crossLicenseCheck.errors);
  allWarnings.push(...crossLicenseCheck.warnings);

  // Check 4: Demo activities isolation
  console.log("  ✓ Checking demo activities...");
  const activitiesCheck = await checkDemoActivitiesIsolation(demoLicenseId);
  allErrors.push(...activitiesCheck.errors);
  allWarnings.push(...activitiesCheck.warnings);

  const passed = allErrors.length === 0;

  if (passed) {
    console.log("✅ All isolation checks passed");
  } else {
    console.log(`❌ Isolation checks failed with ${allErrors.length} errors`);
    allErrors.forEach((err) => console.log(`   - ${err}`));
  }

  if (allWarnings.length > 0) {
    console.log(`⚠️  ${allWarnings.length} warnings:`);
    allWarnings.forEach((warn) => console.log(`   - ${warn}`));
  }

  return {
    passed,
    errors: allErrors,
    warnings: allWarnings,
  };
}
