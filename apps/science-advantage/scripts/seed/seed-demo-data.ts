#!/usr/bin/env tsx
import bcrypt from 'bcryptjs';

import { db, and, eq } from '@reading-advantage/db';
import {
  accounts,
  scienceClassStudents,
  scienceClasses,
  scienceStandardMastery,
  scienceStandards,
  users,
} from '@reading-advantage/db/schema';

import { seedCurriculumUnits } from './seed-curriculum-units';

interface DemoUserData {
  username: string;
  displayUsername: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM';
  gradeLevel: number | null;
}

interface SeededUser {
  id: string;
  username: string;
  role: DemoUserData['role'];
}

export async function seedDemoData(): Promise<void> {
  console.log('👥 Seeding demo users and classes...\n');

  // 1. Seed demo users
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  const demoUsers: DemoUserData[] = [
    {
      username: 'student_demo',
      displayUsername: 'student_demo',
      name: 'Demo Student',
      email: 'student@demo.local',
      role: 'STUDENT',
      gradeLevel: 3,
    },
    {
      username: 'teacher_demo',
      displayUsername: 'teacher_demo',
      name: 'Demo Teacher',
      email: 'teacher@demo.local',
      role: 'TEACHER',
      gradeLevel: null,
    },
    {
      username: 'admin_demo',
      displayUsername: 'admin_demo',
      name: 'Demo Admin',
      email: 'admin@demo.local',
      role: 'ADMIN',
      gradeLevel: null,
    },
    {
      username: 'system_demo',
      displayUsername: 'system_demo',
      name: 'Demo System Admin',
      email: 'system@demo.local',
      role: 'SYSTEM',
      gradeLevel: null,
    },
  ];

  const seededUsers: Record<string, SeededUser> = {};
  for (const userData of demoUsers) {
    const userId = `demo_${userData.role.toLowerCase()}`;

    await db
      .insert(users)
      .values({
        id: userId,
        username: userData.username,
        displayUsername: userData.displayUsername,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        gradeLevel: userData.gradeLevel,
        image: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: users.username });

    // Create Better-Auth credential account.
    const accountId = `${userId}_credential`;
    await db
      .insert(accounts)
      .values({
        id: accountId,
        userId,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: accounts.id });

    seededUsers[userData.role] = { id: userId, username: userData.username, role: userData.role };
    console.log(`  ✓ Created ${userData.role} user: ${userData.username}`);
  }

  // 2. Create demo class
  console.log('\n🏫 Creating demo class...');
  const teacher = seededUsers['TEACHER'];

  const [demoClass] = await db
    .insert(scienceClasses)
    .values({
      name: 'Grade 3 Science (Thai Standards)',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: 'DEMO3T',
      teacherId: teacher.id,
    })
    .onConflictDoUpdate({
      target: scienceClasses.joinCode,
      set: { updatedAt: new Date() },
    })
    .returning({ id: scienceClasses.id, name: scienceClasses.name, joinCode: scienceClasses.joinCode });

  if (!demoClass) {
    throw new Error('Failed to upsert demo class');
  }
  console.log(`  ✓ Created class: ${demoClass.name} (Join code: ${demoClass.joinCode})`);

  // 3. Create curriculum units for demo class
  await seedCurriculumUnits({
    framework: 'THAI',
    gradeLevel: 3,
    classId: demoClass.id,
  });

  // 4. Enroll demo student in class (junction table)
  const student = seededUsers['STUDENT'];
  await db
    .insert(scienceClassStudents)
    .values({ classId: demoClass.id, studentId: student.id })
    .onConflictDoNothing();
  console.log(`✓ Enrolled demo student in ${demoClass.name}`);

  // 5. Seed mastery data for demo student
  console.log('\n📊 Seeding mastery data for demo student...');
  const standards = await db
    .select({ id: scienceStandards.id })
    .from(scienceStandards)
    .where(
      and(
        eq(scienceStandards.framework, 'THAI'),
        eq(scienceStandards.gradeLevel, 3),
      ),
    )
    .limit(12);

  if (standards.length > 0) {
    const masteryData = [
      { level: 0.85, evidence: 10 }, // Proficient
      { level: 0.92, evidence: 12 }, // Proficient
      { level: 0.78, evidence: 9 },  // Developing
      { level: 0.72, evidence: 8 },  // Developing
      { level: 0.65, evidence: 7 },  // Developing
      { level: 0.88, evidence: 11 }, // Proficient
      { level: 0.55, evidence: 6 },  // Needs Support
      { level: 0.48, evidence: 5 },  // Needs Support
      { level: 0.75, evidence: 9 },  // Developing
      { level: 0.82, evidence: 10 }, // Proficient
      { level: 0.58, evidence: 7 },  // Needs Support
      { level: 0.91, evidence: 13 }, // Proficient
    ];

    for (let i = 0; i < Math.min(standards.length, masteryData.length); i++) {
      const standard = standards[i];
      const data = masteryData[i];
      const lastAssessedAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      );

      // decimal(3,2) — write as string to preserve precision.
      await db
        .insert(scienceStandardMastery)
        .values({
          studentId: student.id,
          standardId: standard.id,
          masteryLevel: String(data.level),
          evidenceCount: data.evidence,
          lastAssessedAt,
        })
        .onConflictDoNothing({
          target: [
            scienceStandardMastery.studentId,
            scienceStandardMastery.standardId,
          ],
        });
    }
    console.log(`  ✓ Created ${Math.min(standards.length, masteryData.length)} mastery records for demo student`);
  } else {
    console.log('  ⚠ No standards found - skipping mastery data');
  }
  console.log('');

  // Print demo credentials
  console.log('📝 Demo Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Username: student_demo | Password: Password123!');
  console.log('Username: teacher_demo | Password: Password123!');
  console.log('Username: admin_demo   | Password: Password123!');
  console.log('Username: system_demo  | Password: Password123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🏫 Demo Class:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Grade 3 (Thai) - Join code: DEMO3T');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

const isDirectExecution = process.argv[1]?.includes('seed-demo-data');
if (isDirectExecution) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ seedDemoData failed:', err);
      process.exit(1);
    });
}
