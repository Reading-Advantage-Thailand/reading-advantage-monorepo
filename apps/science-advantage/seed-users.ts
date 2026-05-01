import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding users...');

  // Create test users with different roles
  const users = [
    {
      id: 'user-student-1',
      username: 'student1',
      displayUsername: 'student1',
      name: 'Student User',
      email: 'student@example.com',
      role: UserRole.STUDENT,
      gradeLevel: 3,
    },
    {
      id: 'user-teacher-1',
      username: 'teacher1',
      displayUsername: 'teacher1',
      name: 'Teacher User',
      email: 'teacher@example.com',
      role: UserRole.TEACHER,
    },
    {
      id: 'user-admin-1',
      username: 'admin1',
      displayUsername: 'admin1',
      name: 'Admin User',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    },
    {
      id: 'user-system-1',
      username: 'system1',
      displayUsername: 'system1',
      name: 'System User',
      email: 'system@example.com',
      role: UserRole.SYSTEM,
    },
  ];

  for (const userData of users) {
    try {
      const user = await prisma.user.create({
        data: {
          ...userData,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`Created user: ${user.username} (${user.role})`);
    } catch (error) {
      console.error(`Error creating user ${userData.username}:`, error);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });