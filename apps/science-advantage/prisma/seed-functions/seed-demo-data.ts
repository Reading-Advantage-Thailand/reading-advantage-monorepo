import { PrismaClient, StandardsAlignment } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedCurriculumUnits } from './seed-curriculum-units';

interface DemoUserData {
  username: string;
  displayUsername: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM';
  gradeLevel: number | null;
}

export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  console.log('👥 Seeding demo users and classes...\n');

  // 1. Seed demo users
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);

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

  const users: Record<string, any> = {};
  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: {
        id: `demo_${userData.role.toLowerCase()}`,
        ...userData,
        emailVerified: false,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create account for Better Auth
    const accountId = `${user.id}_credential`;
    await prisma.account.upsert({
      where: { id: accountId },
      update: {},
      create: {
        id: accountId,
        userId: user.id,
        accountId: user.username,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    users[userData.role] = user;
    console.log(`  ✓ Created ${userData.role} user: ${userData.username}`);
  }

  // 2. Create demo class
  console.log('\n🏫 Creating demo class...');
  const teacher = users['TEACHER'];

  const demoClass = await prisma.class.upsert({
    where: { joinCode: 'DEMO3T' },
    update: {},
    create: {
      name: 'Grade 3 Science (Thai Standards)',
      gradeLevel: 3,
      standardsAlignment: 'THAI',
      joinCode: 'DEMO3T',
      teacherId: teacher.id,
    },
  });
  console.log(`  ✓ Created class: ${demoClass.name} (Join code: ${demoClass.joinCode})`);

  // 3. Create curriculum units for demo class
  await seedCurriculumUnits(prisma, {
    framework: 'THAI' as StandardsAlignment,
    gradeLevel: 3,
    classId: demoClass.id,
  });

  // 4. Enroll demo student in class
  const student = users['STUDENT'];
  await prisma.class.update({
    where: { id: demoClass.id },
    data: {
      students: {
        connect: { id: student.id },
      },
    },
  });
  console.log(`✓ Enrolled demo student in ${demoClass.name}`);

  // 5. Seed mastery data for demo student
  console.log('\n📊 Seeding mastery data for demo student...');
  const standards = await prisma.standard.findMany({
    where: {
      framework: 'THAI',
      gradeLevel: 3,
    },
    take: 12, // Get first 12 standards across different strands
  });

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

      await prisma.standardMastery.upsert({
        where: {
          studentId_standardId: {
            studentId: student.id,
            standardId: standard.id,
          },
        },
        update: {},
        create: {
          studentId: student.id,
          standardId: standard.id,
          masteryLevel: data.level,
          evidenceCount: data.evidence,
          lastAssessedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time within last week
        },
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
