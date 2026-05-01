import { PrismaClient } from '@prisma/client';
import { seedActivityData } from '../prisma/seed-functions/seed-activity-data';

const prisma = new PrismaClient();

async function main() {
  try {
    await seedActivityData(prisma);
    console.log('✅ Activity data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding activity data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
