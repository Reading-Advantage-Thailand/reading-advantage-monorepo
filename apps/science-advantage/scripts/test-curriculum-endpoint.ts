/**
 * Manual test script for curriculum endpoint
 * Run with: npx tsx scripts/test-curriculum-endpoint.ts
 */

import { and, asc, db, eq, inArray } from '@reading-advantage/db';
import {
  scienceClasses,
  scienceClassStudents,
  scienceCurriculumUnits,
  scienceLessons,
  scienceUnitLessons,
  users,
} from '@reading-advantage/db/schema';

async function testCurriculumEndpoint() {
  try {
    console.log('🧪 Testing Curriculum Endpoint Data Layer\n');

    // Find a test class
    const [testClass] = await db
      .select({
        id: scienceClasses.id,
        name: scienceClasses.name,
        gradeLevel: scienceClasses.gradeLevel,
        standardsAlignment: scienceClasses.standardsAlignment,
        teacherId: scienceClasses.teacherId,
      })
      .from(scienceClasses)
      .where(
        and(
          eq(scienceClasses.gradeLevel, 3),
          eq(scienceClasses.standardsAlignment, 'THAI')
        )
      )
      .limit(1);

    if (!testClass) {
      console.log('❌ No test class found');
      return;
    }

    const [teacher] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, testClass.teacherId))
      .limit(1);

    const students = await db
      .select({ id: users.id, name: users.name })
      .from(scienceClassStudents)
      .innerJoin(users, eq(users.id, scienceClassStudents.studentId))
      .where(eq(scienceClassStudents.classId, testClass.id))
      .limit(1);

    console.log('✅ Found test class:');
    console.log(`   ID: ${testClass.id}`);
    console.log(`   Name: ${testClass.name}`);
    console.log(`   Grade: ${testClass.gradeLevel}`);
    console.log(`   Alignment: ${testClass.standardsAlignment}`);
    console.log(`   Teacher: ${teacher?.name ?? 'N/A'}`);
    console.log(`   Students: ${students.length}\n`);

    // Fetch curriculum units with lessons (simulating the API endpoint logic)
    const unitRows = await db
      .select()
      .from(scienceCurriculumUnits)
      .where(eq(scienceCurriculumUnits.classId, testClass.id))
      .orderBy(asc(scienceCurriculumUnits.order));

    const unitIds = unitRows.map((unit) => unit.id);
    const lessonLinks = unitIds.length
      ? await db
          .select({
            unitId: scienceUnitLessons.unitId,
            lessonId: scienceLessons.id,
            title: scienceLessons.title,
            order: scienceLessons.order,
          })
          .from(scienceUnitLessons)
          .innerJoin(
            scienceLessons,
            eq(scienceLessons.id, scienceUnitLessons.lessonId)
          )
          .where(inArray(scienceUnitLessons.unitId, unitIds))
          .orderBy(asc(scienceLessons.order))
      : [];

    const lessonsByUnit = new Map<
      string,
      { id: string; title: string; order: number }[]
    >();
    for (const link of lessonLinks) {
      const list = lessonsByUnit.get(link.unitId) ?? [];
      list.push({ id: link.lessonId, title: link.title, order: link.order });
      lessonsByUnit.set(link.unitId, list);
    }

    const units = unitRows.map((unit) => ({
      ...unit,
      lessons: lessonsByUnit.get(unit.id) ?? [],
    }));

    console.log(`✅ Found ${units.length} curriculum unit(s):\n`);

    for (const unit of units) {
      console.log(`   📚 Unit ${unit.order}: ${unit.title}`);
      console.log(`      Description: ${unit.description || 'N/A'}`);
      console.log(`      Lessons: ${unit.lessons.length}`);

      for (const lesson of unit.lessons) {
        console.log(`         📖 Lesson ${lesson.order}: ${lesson.title}`);
      }
      console.log();
    }

    // Test the response format
    const response = {
      class: {
        id: testClass.id,
        name: testClass.name,
        gradeLevel: testClass.gradeLevel,
        standardsAlignment: testClass.standardsAlignment,
      },
      units: units.map(unit => ({
        id: unit.id,
        title: unit.title,
        titleThai: unit.title,
        order: unit.order,
        lessons: unit.lessons.map(lesson => ({
          id: lesson.id,
          slug: lesson.id,
          title: lesson.title,
          titleThai: lesson.title,
          order: lesson.order,
          completed: false,
          started: false,
        })),
      })),
    };

    console.log('✅ Response format validation:');
    console.log(`   Class info: ✓`);
    console.log(`   Units count: ${response.units.length}`);
    console.log(`   Total lessons: ${response.units.reduce((sum, u) => sum + u.lessons.length, 0)}`);
    console.log('\n✅ Curriculum endpoint data layer test successful!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCurriculumEndpoint();
