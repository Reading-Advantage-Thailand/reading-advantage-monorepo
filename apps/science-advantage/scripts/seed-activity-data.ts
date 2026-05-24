#!/usr/bin/env tsx
import { seedActivityData } from './seed/seed-activity-data';

async function main(): Promise<void> {
  try {
    await seedActivityData();
    console.log('✅ Activity data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding activity data:', error);
    throw error;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
