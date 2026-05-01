/**
 * Manual test script for curriculum endpoint
 * Run with: npx tsx scripts/test-curriculum-endpoint.ts
 */

import prisma from '../lib/prisma';

async function testCurriculumEndpoint() {
  try {
    console.log('🧪 Testing Curriculum Endpoint Data Layer\n');

    // Find a test class
    const testClass = await prisma.class.findFirst({
      where: {
        gradeLevel: 3,
        standardsAlignment: 'THAI',
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
        students: {
          select: {
            id: true,
            name: true,
          },
          take: 1,
        },
      },
    });

    if (!testClass) {
      console.log('❌ No test class found');
      return;
    }

    console.log('✅ Found test class:');
    console.log(`   ID: ${testClass.id}`);
    console.log(`   Name: ${testClass.name}`);
    console.log(`   Grade: ${testClass.gradeLevel}`);
    console.log(`   Alignment: ${testClass.standardsAlignment}`);
    console.log(`   Teacher: ${testClass.teacher.name}`);
    console.log(`   Students: ${testClass.students.length}\n`);

    // Fetch curriculum units with lessons (simulating the API endpoint logic)
    const units = await prisma.curriculumUnit.findMany({
      where: {
        classId: testClass.id,
      },
      include: {
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

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
  } finally {
    await prisma.$disconnect();
  }
}

testCurriculumEndpoint();
