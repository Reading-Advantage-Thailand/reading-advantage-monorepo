import { PrismaClient } from '@prisma/client';
import { hashPassword } from './lib/auth/password';

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('Creating test users with passwords...');

  const users = [
    {
      username: 'student1',
      password: 'password123',
      name: 'Student User',
      email: 'student@example.com',
      displayUsername: 'student1',
      role: 'STUDENT' as const,
    },
    {
      username: 'teacher1',
      password: 'password123',
      name: 'Teacher User',
      email: 'teacher@example.com',
      displayUsername: 'teacher1',
      role: 'TEACHER' as const,
    },
    {
      username: 'admin1',
      password: 'password123',
      name: 'Admin User',
      email: 'admin@example.com',
      displayUsername: 'admin1',
      role: 'ADMIN' as const,
    },
    {
      username: 'system1',
      password: 'password123',
      name: 'System User',
      email: 'system@example.com',
      displayUsername: 'system1',
      role: 'SYSTEM' as const,
    },
  ];

  for (const userData of users) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      const user = await prisma.user.upsert({
        where: { username: userData.username },
        update: {
          name: userData.name,
          email: userData.email,
          displayUsername: userData.displayUsername,
          role: userData.role,
          updatedAt: new Date(),
        },
        create: {
          id: `seed_${userData.username}`,
          username: userData.username,
          displayUsername: userData.displayUsername,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          emailVerified: false,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      await prisma.account.upsert({
        where: { id: `${user.id}_credential` },
        update: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
        create: {
          id: `${user.id}_credential`,
          accountId: user.username,
          providerId: 'credential',
          userId: user.id,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✓ Ensured user ${userData.username}`);
    } catch (error) {
      console.error(`Error creating user ${userData.username}:`, error);
    }
  }

  console.log('Test user creation completed!');
  console.log('You can now login with any of these users using password: password123');
}

createTestUsers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
