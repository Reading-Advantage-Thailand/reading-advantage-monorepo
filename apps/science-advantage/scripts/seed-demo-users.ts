#!/usr/bin/env tsx
import bcrypt from 'bcryptjs';

import { db } from '@reading-advantage/db';
import { accounts, users } from '@reading-advantage/db/schema';

async function main() {
  const password = 'Password123!';
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

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
        image: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: users.username });

    // Create account for Better Auth (credential provider)
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
