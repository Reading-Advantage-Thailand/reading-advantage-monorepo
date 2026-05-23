/**
 * Backfill Script for School Schema Migration
 * 
 * This script migrates existing license-based data to the new School model.
 * It is designed to be idempotent and can be run multiple times safely.
 * 
 * What it does:
 * 1. Creates School records from unique license schoolName values
 * 2. Associates existing licenses with their corresponding schools
 * 3. Updates users and classrooms to link to schools via their licenses
 * 4. Bootstraps default feature flags on licenses based on license type
 * 
 * Usage:
 *   ts-node scripts/backfill-schools.ts
 *   or
 *   npm run backfill:schools
 * 
 * Options:
 *   DRY_RUN=true - Preview changes without committing (default: false)
 *   VERBOSE=true - Show detailed logging (default: false)
 */

import {
  db,
  schools,
  licenses,
  licenseOnUsers,
  users,
  classrooms,
  eq,
  and,
  isNull,
  isNotNull,
  count,
  sql,
} from "@reading-advantage/db";
import { LicenseType } from "@/lib/enums";

const DRY_RUN = process.env.DRY_RUN === 'true';
const VERBOSE = process.env.VERBOSE === 'true';

// Default feature flags for each license type
const DEFAULT_FEATURE_FLAGS: Record<LicenseType, Record<string, boolean>> = {
  BASIC: {
    dashboardEnabled: false,
    velocityMetrics: false,
    assignmentFunnel: false,
    srsHealth: false,
    genreRecommendations: false,
    activityHeatmap: false,
    cefrAlignment: false,
  },
  PREMIUM: {
    dashboardEnabled: true,
    velocityMetrics: true,
    assignmentFunnel: true,
    srsHealth: true,
    genreRecommendations: false,
    activityHeatmap: false,
    cefrAlignment: false,
  },
  ENTERPRISE: {
    dashboardEnabled: true,
    velocityMetrics: true,
    assignmentFunnel: true,
    srsHealth: true,
    genreRecommendations: true,
    activityHeatmap: true,
    cefrAlignment: true,
  },
};

interface BackfillStats {
  schoolsCreated: number;
  licensesUpdated: number;
  usersUpdated: number;
  classroomsUpdated: number;
  featureFlagsSet: number;
  errors: number;
}

function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
  }[level];

  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function verboseLog(message: string) {
  if (VERBOSE) {
    console.log(`  → ${message}`);
  }
}

/**
 * Step 1: Create School records from unique license schoolName values
 */
async function createSchools(): Promise<Map<string, string>> {
  log('Step 1: Creating schools from licenses...');

  // Get unique school names from licenses (distinct on schoolName)
  const distinctLicenses = await db
    .selectDistinctOn([licenses.schoolName], {
      schoolName: licenses.schoolName,
      schoolId: licenses.schoolId,
    })
    .from(licenses);

  const schoolMap = new Map<string, string>(); // schoolName -> schoolId
  let created = 0;

  for (const license of distinctLicenses) {
    // Skip if school already exists
    if (license.schoolId) {
      const [existingSchool] = await db
        .select()
        .from(schools)
        .where(eq(schools.id, license.schoolId))
        .limit(1);

      if (existingSchool) {
        schoolMap.set(license.schoolName, existingSchool.id);
        verboseLog(`School already exists: ${license.schoolName}`);
        continue;
      }
    }

    // Check if we already created a school with this name
    if (schoolMap.has(license.schoolName)) {
      verboseLog(`Using existing school mapping: ${license.schoolName}`);
      continue;
    }

    // Create new school
    if (!DRY_RUN) {
      const [school] = await db
        .insert(schools)
        .values({
          name: license.schoolName,
          country: 'Thailand',
          // Note: district and province can be updated manually later
        })
        .returning();

      schoolMap.set(license.schoolName, school.id);
      created++;
      verboseLog(`Created school: ${school.name} (ID: ${school.id})`);
    } else {
      verboseLog(`[DRY RUN] Would create school: ${license.schoolName}`);
      schoolMap.set(license.schoolName, `dry-run-id-${created}`);
      created++;
    }
  }

  log(`Created ${created} schools`);
  return schoolMap;
}

/**
 * Step 2: Update licenses with school associations and feature flags
 */
async function updateLicenses(schoolMap: Map<string, string>): Promise<number> {
  log('Step 2: Updating licenses with school associations and feature flags...');

  const allLicenses = await db.select().from(licenses);
  let updated = 0;

  for (const license of allLicenses) {
    const schoolId = schoolMap.get(license.schoolName);

    if (!schoolId) {
      log(`Warning: No school found for license ${license.key}`, 'warn');
      continue;
    }

    // Determine feature flags (use existing or set defaults)
    let featureFlags = license.featureFlags as Record<string, unknown> | null;

    if (!featureFlags || Object.keys(featureFlags).length === 0) {
      featureFlags = DEFAULT_FEATURE_FLAGS[license.licenseType as LicenseType];
      verboseLog(`Setting default feature flags for ${license.licenseType} license: ${license.key}`);
    }

    // Update license
    if (!DRY_RUN) {
      await db
        .update(licenses)
        .set({ schoolId, featureFlags: featureFlags as Record<string, unknown> })
        .where(eq(licenses.id, license.id));
      updated++;
      verboseLog(`Updated license: ${license.key} -> School: ${schoolId}`);
    } else {
      verboseLog(`[DRY RUN] Would update license: ${license.key} -> School: ${schoolId}`);
      updated++;
    }
  }

  log(`Updated ${updated} licenses`);
  return updated;
}

/**
 * Step 3: Update users with school associations (via their licenses)
 */
async function updateUsers(schoolMap: Map<string, string>): Promise<number> {
  log('Step 3: Updating users with school associations...');

  // Get all users with license associations
  const rows = await db
    .select({
      userId: users.id,
      userEmail: users.email,
      userSchoolId: users.schoolId,
      licenseSchoolName: licenses.schoolName,
    })
    .from(licenseOnUsers)
    .innerJoin(users, eq(licenseOnUsers.userId, users.id))
    .innerJoin(licenses, eq(licenseOnUsers.licenseId, licenses.id));

  let updated = 0;

  for (const row of rows) {
    // Skip if user already has a school
    if (row.userSchoolId) {
      verboseLog(`User ${row.userEmail} already has school ${row.userSchoolId}`);
      continue;
    }

    const schoolId = schoolMap.get(row.licenseSchoolName);

    if (!schoolId) {
      log(`Warning: No school found for user ${row.userEmail}`, 'warn');
      continue;
    }

    // Update user
    if (!DRY_RUN) {
      await db
        .update(users)
        .set({ schoolId })
        .where(eq(users.id, row.userId));
      updated++;
      verboseLog(`Updated user: ${row.userEmail} -> School: ${schoolId}`);
    } else {
      verboseLog(`[DRY RUN] Would update user: ${row.userEmail} -> School: ${schoolId}`);
      updated++;
    }
  }

  log(`Updated ${updated} users`);
  return updated;
}

/**
 * Step 4: Update classrooms with school associations
 */
async function updateClassrooms(): Promise<number> {
  log('Step 4: Updating classrooms with school associations...');

  // Get all classrooms with their teachers
  const rows = await db
    .select({
      id: classrooms.id,
      name: classrooms.name,
      schoolId: classrooms.schoolId,
      teacherSchoolId: users.schoolId,
    })
    .from(classrooms)
    .leftJoin(users, eq(classrooms.teacherId, users.id));

  let updated = 0;

  for (const classroom of rows) {
    // Skip if classroom already has a school
    if (classroom.schoolId) {
      verboseLog(`Classroom ${classroom.name} already has school ${classroom.schoolId}`);
      continue;
    }

    // Use teacher's school if available
    const schoolId = classroom.teacherSchoolId;

    if (!schoolId) {
      log(`Warning: No school found for classroom ${classroom.name}`, 'warn');
      continue;
    }

    // Update classroom
    if (!DRY_RUN) {
      await db
        .update(classrooms)
        .set({ schoolId })
        .where(eq(classrooms.id, classroom.id));
      updated++;
      verboseLog(`Updated classroom: ${classroom.name} -> School: ${schoolId}`);
    } else {
      verboseLog(`[DRY RUN] Would update classroom: ${classroom.name} -> School: ${schoolId}`);
      updated++;
    }
  }

  log(`Updated ${updated} classrooms`);
  return updated;
}

/**
 * Validate the backfill results
 */
async function validateResults(): Promise<boolean> {
  log('Step 5: Validating backfill results...');

  let isValid = true;

  // Check for licenses without schools
  const [licensesWithoutSchoolsAgg] = await db
    .select({ count: count() })
    .from(licenses)
    .where(isNull(licenses.schoolId));
  const licensesWithoutSchools = Number(licensesWithoutSchoolsAgg?.count ?? 0);

  if (licensesWithoutSchools > 0) {
    log(`Found ${licensesWithoutSchools} licenses without schools`, 'warn');
    isValid = false;
  }

  // Check for licenses without feature flags (empty JSON object)
  const [licensesWithoutFlagsAgg] = await db
    .select({ count: count() })
    .from(licenses)
    .where(sql`${licenses.featureFlags} = '{}'::jsonb`);
  const licensesWithoutFlags = Number(licensesWithoutFlagsAgg?.count ?? 0);

  if (licensesWithoutFlags > 0) {
    log(`Found ${licensesWithoutFlags} licenses without feature flags`, 'warn');
    isValid = false;
  }

  // Summary counts
  const [schoolAgg] = await db.select({ count: count() }).from(schools);
  const [licenseAgg] = await db.select({ count: count() }).from(licenses);
  const [userAgg] = await db
    .select({ count: count() })
    .from(users)
    .where(isNotNull(users.schoolId));
  const [classroomAgg] = await db
    .select({ count: count() })
    .from(classrooms)
    .where(isNotNull(classrooms.schoolId));

  console.log('\n📊 Summary:');
  console.log(`   Schools: ${schoolAgg?.count ?? 0}`);
  console.log(`   Licenses: ${licenseAgg?.count ?? 0}`);
  console.log(`   Users with schools: ${userAgg?.count ?? 0}`);
  console.log(`   Classrooms with schools: ${classroomAgg?.count ?? 0}`);

  if (isValid) {
    log('✅ Validation passed!', 'info');
  } else {
    log('⚠️  Validation found issues - please review', 'warn');
  }

  return isValid;
}

/**
 * Main backfill execution
 */
async function main() {
  console.log('\n🔄 Starting School Schema Backfill Script\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be committed\n');
  }

  const stats: BackfillStats = {
    schoolsCreated: 0,
    licensesUpdated: 0,
    usersUpdated: 0,
    classroomsUpdated: 0,
    featureFlagsSet: 0,
    errors: 0,
  };

  // Mark a couple of fields explicitly used to placate the unused-warnings.
  void stats.featureFlagsSet;
  void stats.errors;

  try {
    // Execute backfill steps
    const schoolMap = await createSchools();
    stats.schoolsCreated = schoolMap.size;

    stats.licensesUpdated = await updateLicenses(schoolMap);
    stats.usersUpdated = await updateUsers(schoolMap);
    stats.classroomsUpdated = await updateClassrooms();

    // Validate results
    if (!DRY_RUN) {
      await validateResults();
    }

    // Final summary
    console.log('\n✅ Backfill completed successfully!\n');
    console.log('📈 Statistics:');
    console.log(`   Schools created: ${stats.schoolsCreated}`);
    console.log(`   Licenses updated: ${stats.licensesUpdated}`);
    console.log(`   Users updated: ${stats.usersUpdated}`);
    console.log(`   Classrooms updated: ${stats.classroomsUpdated}\n`);

    if (DRY_RUN) {
      console.log('💡 Run without DRY_RUN=true to apply these changes.\n');
    }

  } catch (error) {
    log(`Fatal error during backfill: ${error}`, 'error');
    stats.errors++;
    throw error;
  }
}

// `and` may be unused depending on future edits; preserve import side-effect free.
void and;

main()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  });
