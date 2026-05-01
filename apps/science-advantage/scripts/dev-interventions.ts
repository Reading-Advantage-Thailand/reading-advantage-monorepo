#!/usr/bin/env tsx
import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

import { detectAlerts } from '@/lib/interventions/detect-alerts';
import { interventionConfig } from '@/lib/interventions/config';

const prisma = new PrismaClient();

async function main() {
  const classId = process.env.CLASS_ID ?? process.argv[2];
  if (!classId) {
    console.error(
      'Missing classId. Pass CLASS_ID=<classId> npm run dev:interventions or provide it as the first argument.'
    );
    process.exit(1);
  }

  const klass = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      students: {
        select: {
          id: true,
          name: true,
          gradeLevel: true,
        },
      },
    },
  });

  if (!klass) {
    console.error(`Class ${classId} not found.`);
    process.exit(1);
  }

  if (klass.students.length === 0) {
    console.info(`Class ${classId} has no enrolled students.`);
    process.exit(0);
  }

  const masteryRecords = await prisma.standardMastery.findMany({
    where: {
      studentId: { in: klass.students.map((student) => student.id) },
      masteryLevel: { lt: interventionConfig.masteryFilterLevel },
    },
    include: {
      standard: {
        select: {
          code: true,
          description: true,
        },
      },
    },
  });

  const detection = detectAlerts({
    classMeta: { id: klass.id, name: klass.name },
    students: klass.students,
    masteryRecords,
  });

  if (detection.alerts.length === 0) {
    console.info(`No intervention alerts generated for class ${klass.name}.`);
    return;
  }

  console.info(
    `Generated ${detection.alerts.length} alert(s) for class ${klass.name}:`
  );
  detection.alerts.forEach((alert, index) => {
    console.info(
      `${index + 1}. ${alert.studentName} - ${alert.alertSeverity.toUpperCase()} (weak standards: ${alert.weakStandardCount}, avg mastery: ${alert.avgWeakMastery})`
    );
  });
}

main()
  .catch((error) => {
    console.error('Unable to generate intervention alerts locally:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
