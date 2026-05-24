#!/usr/bin/env tsx
import 'dotenv/config';

import {
  and,
  db,
  eq,
  inArray,
  lt,
  sql,
} from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceStandardMastery,
  scienceStandards,
  users,
} from '@reading-advantage/db/schema';

import { detectAlerts } from '@/lib/interventions/detect-alerts';
import { interventionConfig } from '@/lib/interventions/config';

async function main() {
  const classId = process.env.CLASS_ID ?? process.argv[2];
  if (!classId) {
    console.error(
      'Missing classId. Pass CLASS_ID=<classId> npm run dev:interventions or provide it as the first argument.'
    );
    process.exit(1);
  }

  const [klass] = await db
    .select({ id: scienceClasses.id, name: scienceClasses.name })
    .from(scienceClasses)
    .where(eq(scienceClasses.id, classId))
    .limit(1);

  if (!klass) {
    console.error(`Class ${classId} not found.`);
    process.exit(1);
  }

  const students = await db
    .select({
      id: users.id,
      name: users.name,
      gradeLevel: users.gradeLevel,
    })
    .from(scienceClassStudents)
    .innerJoin(users, eq(users.id, scienceClassStudents.studentId))
    .where(eq(scienceClassStudents.classId, klass.id));

  if (students.length === 0) {
    console.info(`Class ${classId} has no enrolled students.`);
    process.exit(0);
  }

  const studentIds = students.map((student) => student.id);

  const masteryRows = await db
    .select({
      studentId: scienceStandardMastery.studentId,
      lastAssessedAt: scienceStandardMastery.lastAssessedAt,
      masteryLevel: scienceStandardMastery.masteryLevel,
      standardCode: scienceStandards.code,
      standardDescription: scienceStandards.description,
    })
    .from(scienceStandardMastery)
    .innerJoin(
      scienceStandards,
      eq(scienceStandards.id, scienceStandardMastery.standardId)
    )
    .where(
      and(
        inArray(scienceStandardMastery.studentId, studentIds),
        lt(
          scienceStandardMastery.masteryLevel,
          sql`${interventionConfig.masteryFilterLevel}`
        )
      )
    );

  const masteryRecords = masteryRows.map((row) => ({
    studentId: row.studentId,
    lastAssessedAt: row.lastAssessedAt,
    masteryLevel: row.masteryLevel,
    standard: {
      code: row.standardCode,
      description: row.standardDescription,
    },
  }));

  const studentsForDetection = students.map((student) => ({
    id: student.id,
    name: student.name ?? '',
    gradeLevel: student.gradeLevel,
  }));

  const detection = detectAlerts({
    classMeta: { id: klass.id, name: klass.name },
    students: studentsForDetection,
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

main().catch((error) => {
  console.error('Unable to generate intervention alerts locally:', error);
  process.exit(1);
});
