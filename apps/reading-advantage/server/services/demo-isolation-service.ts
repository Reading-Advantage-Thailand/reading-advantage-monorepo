import { db, and, eq, or, ne, gte, ilike, inArray } from "@reading-advantage/db";
import {
  users,
  schools,
  licenses,
  classrooms,
  classroomStudents,
  userActivity,
  xpLogs,
} from "@reading-advantage/db/schema";

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
  const [row] = await db
    .select({ schoolName: schools.name })
    .from(licenses)
    .leftJoin(schools, eq(licenses.schoolId, schools.id))
    .where(eq(licenses.id, licenseId))
    .limit(1);

  if (!row) {
    return false;
  }

  // Check if this is the demo license (school name matches "Reading Advantage Academy")
  return row.schoolName === "Reading Advantage Academy";
}

/**
 * Verify that a school is a demo school
 */
export async function verifyDemoSchool(schoolId: string): Promise<boolean> {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

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
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.name, "Reading Advantage Academy"))
    .limit(1);

  if (!school) {
    return null;
  }

  const schoolLicenses = await db
    .select({ id: licenses.id })
    .from(licenses)
    .where(eq(licenses.schoolId, school.id));

  if (schoolLicenses.length === 0) {
    return null;
  }

  return {
    schoolId: school.id,
    licenseId: schoolLicenses[0].id,
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
  const demoUsers = await db
    .select()
    .from(users)
    .where(
      or(
        ilike(users.email, "%demo-student%"),
        ilike(users.email, "%demo-teacher%"),
        ilike(users.email, "%demo-admin%")
      )!
    );

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
  const demoClassrooms = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.schoolId, demoSchoolId));

  // For each classroom, fetch its students with user record joined
  for (const classroom of demoClassrooms) {
    const enrolled = await db
      .select({ student: users })
      .from(classroomStudents)
      .innerJoin(users, eq(classroomStudents.studentId, users.id))
      .where(eq(classroomStudents.classroomId, classroom.id));

    for (const { student } of enrolled) {
      if (student.licenseId !== demoLicenseId) {
        errors.push(
          `Demo classroom ${classroom.name} (${classroom.id}) contains non-demo student: ${student.email} (${student.id})`
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
  const nonDemoUsersInDemoSchool = await db
    .select()
    .from(users)
    .where(
      and(eq(users.schoolId, demoSchoolId), ne(users.licenseId, demoLicenseId))!
    );

  if (nonDemoUsersInDemoSchool.length > 0) {
    errors.push(
      `Found ${nonDemoUsersInDemoSchool.length} non-demo users in demo school: ${nonDemoUsersInDemoSchool.map((u) => u.email).join(", ")}`
    );
  }

  // Check for demo users in non-demo schools
  const demoUsersInNonDemoSchools = await db
    .select()
    .from(users)
    .where(
      and(eq(users.licenseId, demoLicenseId), ne(users.schoolId, demoSchoolId))!
    );

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
  const demoUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.licenseId, demoLicenseId));

  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length === 0) {
    warnings.push("No demo users found");
    return { passed: true, errors, warnings };
  }

  // Build activity conditions
  const activityConds = [inArray(userActivity.userId, demoUserIds)];
  if (checkDate) activityConds.push(gte(userActivity.createdAt, checkDate));

  const xpConds = [inArray(xpLogs.userId, demoUserIds)];
  if (checkDate) xpConds.push(gte(xpLogs.createdAt, checkDate));

  // Check UserActivity (joined with user for licenseId comparison)
  const userActivityRows = await db
    .select({
      activityId: userActivity.id,
      userLicenseId: users.licenseId,
      userEmail: users.email,
    })
    .from(userActivity)
    .innerJoin(users, eq(userActivity.userId, users.id))
    .where(and(...activityConds)!);

  for (const activity of userActivityRows) {
    if (activity.userLicenseId !== demoLicenseId) {
      errors.push(
        `UserActivity ${activity.activityId} belongs to user ${activity.userEmail} with wrong licenseId: ${activity.userLicenseId}`
      );
    }
  }

  // Check XPLog (joined with user for licenseId comparison)
  const xpLogRows = await db
    .select({
      logId: xpLogs.id,
      userLicenseId: users.licenseId,
      userEmail: users.email,
    })
    .from(xpLogs)
    .innerJoin(users, eq(xpLogs.userId, users.id))
    .where(and(...xpConds)!);

  for (const log of xpLogRows) {
    if (log.userLicenseId !== demoLicenseId) {
      errors.push(
        `XPLog ${log.logId} belongs to user ${log.userEmail} with wrong licenseId: ${log.userLicenseId}`
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
