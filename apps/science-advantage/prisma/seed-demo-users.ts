import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Demo accounts for each role
  const demoUsers = [
    {
      username: 'student_demo',
      displayUsername: 'student_demo',
      name: 'Demo Student',
      email: 'student@demo.local',
      role: 'STUDENT' as const,
    },
    {
      username: 'teacher_demo',
      displayUsername: 'teacher_demo',
      name: 'Demo Teacher',
      email: 'teacher@demo.local',
      role: 'TEACHER' as const,
    },
    {
      username: 'admin_demo',
      displayUsername: 'admin_demo',
      name: 'Demo Admin',
      email: 'admin@demo.local',
      role: 'ADMIN' as const,
    },
    {
      username: 'system_demo',
      displayUsername: 'system_demo',
      name: 'Demo System Admin',
      email: 'system@demo.local',
      role: 'SYSTEM' as const,
    },
  ];

  console.log('🌱 Seeding demo users...');

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
      where: {
        id: accountId,
      },
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

    console.log(`✓ Created ${userData.role} user: ${userData.username}`);
  }

  console.log('\n📝 Demo Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Username: student_demo | Password: Password123!');
  console.log('Username: teacher_demo | Password: Password123!');
  console.log('Username: admin_demo   | Password: Password123!');
  console.log('Username: system_demo  | Password: Password123!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
