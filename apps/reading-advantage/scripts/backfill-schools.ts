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

import { PrismaClient, LicenseType } from '@prisma/client';

const prisma = new PrismaClient();

const DRY_RUN = process.env.DRY_RUN === 'true';
const VERBOSE = process.env.VERBOSE === 'true';

// Default feature flags for each license type
const DEFAULT_FEATURE_FLAGS = {
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

async function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✓',
    warn: '⚠',
    error: '✗',
  }[level];
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

async function verboseLog(message: string) {
  if (VERBOSE) {
    console.log(`  → ${message}`);
  }
}

/**
 * Step 1: Create School records from unique license schoolName values
 */
async function createSchools(): Promise<Map<string, string>> {
  await log('Step 1: Creating schools from licenses...');
  
  // Get unique school names from licenses
  const licenses = await prisma.license.findMany({
    select: {
      schoolName: true,
      schoolId: true,
    },
    distinct: ['schoolName'],
  });
  
  const schoolMap = new Map<string, string>(); // schoolName -> schoolId
  let created = 0;
  
  for (const license of licenses) {
    // Skip if school already exists
    if (license.schoolId) {
      const existingSchool = await prisma.school.findUnique({
        where: { id: license.schoolId },
      });
      
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
      const school = await prisma.school.create({
        data: {
          name: license.schoolName,
          country: 'Thailand',
          // Note: district and province can be updated manually later
        },
      });
      
      schoolMap.set(license.schoolName, school.id);
      created++;
      verboseLog(`Created school: ${school.name} (ID: ${school.id})`);
    } else {
      verboseLog(`[DRY RUN] Would create school: ${license.schoolName}`);
      schoolMap.set(license.schoolName, `dry-run-id-${created}`);
      created++;
    }
  }
  
  await log(`Created ${created} schools`);
  return schoolMap;
}

/**
 * Step 2: Update licenses with school associations and feature flags
 */
async function updateLicenses(schoolMap: Map<string, string>): Promise<number> {
  await log('Step 2: Updating licenses with school associations and feature flags...');
  
  const licenses = await prisma.license.findMany();
  let updated = 0;
  
  for (const license of licenses) {
    const schoolId = schoolMap.get(license.schoolName);
    
    if (!schoolId) {
      await log(`Warning: No school found for license ${license.key}`, 'warn');
      continue;
    }
    
    // Determine feature flags (use existing or set defaults)
    let featureFlags = license.featureFlags as any;
    
    if (!featureFlags || Object.keys(featureFlags).length === 0) {
      featureFlags = DEFAULT_FEATURE_FLAGS[license.licenseType];
      verboseLog(`Setting default feature flags for ${license.licenseType} license: ${license.key}`);
    }
    
    // Update license
    if (!DRY_RUN) {
      await prisma.license.update({
        where: { id: license.id },
        data: {
          schoolId,
          featureFlags,
        },
      });
      updated++;
      verboseLog(`Updated license: ${license.key} -> School: ${schoolId}`);
    } else {
      verboseLog(`[DRY RUN] Would update license: ${license.key} -> School: ${schoolId}`);
      updated++;
    }
  }
  
  await log(`Updated ${updated} licenses`);
  return updated;
}

/**
 * Step 3: Update users with school associations (via their licenses)
 */
async function updateUsers(schoolMap: Map<string, string>): Promise<number> {
  await log('Step 3: Updating users with school associations...');
  
  // Get all users with license associations
  const licenseOnUsers = await prisma.licenseOnUser.findMany({
    include: {
      license: true,
      user: true,
    },
  });
  
  let updated = 0;
  
  for (const lou of licenseOnUsers) {
    // Skip if user already has a school
    if (lou.user.schoolId) {
      verboseLog(`User ${lou.user.email} already has school ${lou.user.schoolId}`);
      continue;
    }
    
    const schoolId = schoolMap.get(lou.license.schoolName);
    
    if (!schoolId) {
      await log(`Warning: No school found for user ${lou.user.email}`, 'warn');
      continue;
    }
    
    // Update user
    if (!DRY_RUN) {
      await prisma.user.update({
        where: { id: lou.user.id },
        data: { schoolId },
      });
      updated++;
      verboseLog(`Updated user: ${lou.user.email} -> School: ${schoolId}`);
    } else {
      verboseLog(`[DRY RUN] Would update user: ${lou.user.email} -> School: ${schoolId}`);
      updated++;
    }
  }
  
  await log(`Updated ${updated} users`);
  return updated;
}

/**
 * Step 4: Update classrooms with school associations
 */
async function updateClassrooms(): Promise<number> {
  await log('Step 4: Updating classrooms with school associations...');
  
  // Get all classrooms with their teachers
  const classrooms = await prisma.classroom.findMany({
    include: {
      teacher: true,
    },
  });
  
  let updated = 0;
  
  for (const classroom of classrooms) {
    // Skip if classroom already has a school
    if (classroom.schoolId) {
      verboseLog(`Classroom ${classroom.classroomName} already has school ${classroom.schoolId}`);
      continue;
    }
    
    // Use teacher's school if available
    const schoolId = classroom.teacher?.schoolId;
    
    if (!schoolId) {
      await log(`Warning: No school found for classroom ${classroom.classroomName}`, 'warn');
      continue;
    }
    
    // Update classroom
    if (!DRY_RUN) {
      await prisma.classroom.update({
        where: { id: classroom.id },
        data: { schoolId },
      });
      updated++;
      verboseLog(`Updated classroom: ${classroom.classroomName} -> School: ${schoolId}`);
    } else {
      verboseLog(`[DRY RUN] Would update classroom: ${classroom.classroomName} -> School: ${schoolId}`);
      updated++;
    }
  }
  
  await log(`Updated ${updated} classrooms`);
  return updated;
}

/**
 * Validate the backfill results
 */
async function validateResults(): Promise<boolean> {
  await log('Step 5: Validating backfill results...');
  
  let isValid = true;
  
  // Check for licenses without schools
  const licensesWithoutSchools = await prisma.license.count({
    where: { schoolId: null },
  });
  
  if (licensesWithoutSchools > 0) {
    await log(`Found ${licensesWithoutSchools} licenses without schools`, 'warn');
    isValid = false;
  }
  
  // Check for licenses without feature flags
  const licensesWithoutFlags = await prisma.license.count({
    where: {
      featureFlags: { equals: {} },
    },
  });
  
  if (licensesWithoutFlags > 0) {
    await log(`Found ${licensesWithoutFlags} licenses without feature flags`, 'warn');
    isValid = false;
  }
  
  // Summary counts
  const schoolCount = await prisma.school.count();
  const licenseCount = await prisma.license.count();
  const userWithSchoolCount = await prisma.user.count({ where: { schoolId: { not: null } } });
  const classroomWithSchoolCount = await prisma.classroom.count({ where: { schoolId: { not: null } } });
  
  console.log('\n📊 Summary:');
  console.log(`   Schools: ${schoolCount}`);
  console.log(`   Licenses: ${licenseCount}`);
  console.log(`   Users with schools: ${userWithSchoolCount}`);
  console.log(`   Classrooms with schools: ${classroomWithSchoolCount}`);
  
  if (isValid) {
    await log('✅ Validation passed!', 'info');
  } else {
    await log('⚠️  Validation found issues - please review', 'warn');
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
    await log(`Fatal error during backfill: ${error}`, 'error');
    stats.errors++;
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
