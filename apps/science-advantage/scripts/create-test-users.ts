#!/usr/bin/env tsx
import { hashPassword } from '@reading-advantage/auth';
import { db } from '@reading-advantage/db';
import { accounts, users } from '@reading-advantage/db/schema';

async function createTestUsers() {
  console.log('Creating test users with passwords...');

  const usersData = [
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

  for (const userData of usersData) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      const userId = `seed_${userData.username}`;
      const now = new Date();

      await db
        .insert(users)
        .values({
          id: userId,
          username: userData.username,
          displayUsername: userData.displayUsername,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          image: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: users.username,
          set: {
            name: userData.name,
            email: userData.email,
            displayUsername: userData.displayUsername,
            role: userData.role,
            updatedAt: now,
          },
        });

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
        .onConflictDoUpdate({
          target: accounts.id,
          set: {
            password: hashedPassword,
            updatedAt: now,
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

createTestUsers().catch((error) => {
  console.error(error);
  process.exit(1);
});
