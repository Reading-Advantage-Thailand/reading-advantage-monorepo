import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let joinCodeCounter = 0;
const nextJoinCode = () => `TEST${(joinCodeCounter++).toString().padStart(4, '0')}`;

describe('Advanced Data Schema Tests', () => {
  beforeEach(async () => {
    // Clean up before each test - order matters for foreign keys
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    // Clean up after each test - order matters for foreign keys
    await prisma.curriculumUnit.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.class.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      await expect(prisma.$connect()).resolves.not.toThrow();
    });
  });

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-1',
          email: 'test@example.com',
          name: 'Test User',
          username: 'testuser1',
          displayUsername: 'TestUser1',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
    });

    it('should create a user with role and grade level', async () => {
      const user = await prisma.user.create({
        data: {
          id: 'test-user-2',
          email: 'teacher@example.com',
          name: 'Test Teacher',
          username: 'testteacher',
          displayUsername: 'TestTeacher',
          role: 'TEACHER',
          gradeLevel: null,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      expect(user.role).toBe('TEACHER');
      expect(user.gradeLevel).toBeNull();
    });
  });

  describe('Class Model', () => {
    it('should create a class with THAI standards alignment', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-1',
          email: 'teacher@example.com',
          name: 'Teacher',
          username: 'teacher1',
          displayUsername: 'Teacher1',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const classRecord = await prisma.class.create({
        data: {
          name: 'Test Thai Class',
          gradeLevel: 3,
          standardsAlignment: 'THAI',
          teacherId: teacher.id,
          joinCode: nextJoinCode(),
        }
      });

      expect(classRecord.standardsAlignment).toBe('THAI');
      expect(classRecord.gradeLevel).toBe(3);
      expect(classRecord.teacherId).toBe(teacher.id);
    });

    it('should create a class with NGSS standards alignment', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-2',
          email: 'teacher2@example.com',
          name: 'Teacher 2',
          username: 'teacher2',
          displayUsername: 'Teacher2',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const classRecord = await prisma.class.create({
        data: {
          name: 'Test NGSS Class',
          gradeLevel: 4,
          standardsAlignment: 'NGSS',
          teacherId: teacher.id,
          joinCode: nextJoinCode(),
        }
      });

      expect(classRecord.standardsAlignment).toBe('NGSS');
      expect(classRecord.gradeLevel).toBe(4);
    });
  });

  describe('Standard Model', () => {
    it('should create a standard with NGSS framework', async () => {
      const standard = await prisma.standard.create({
        data: {
          framework: 'NGSS',
          code: 'NGSS-3-LS1-1',
          description: 'Test NGSS standard',
          gradeLevel: 3
        }
      });

      expect(standard.framework).toBe('NGSS');
      expect(standard.code).toBe('NGSS-3-LS1-1');
      expect(standard.gradeLevel).toBe(3);
    });

    it('should enforce unique constraint on framework + code', async () => {
      await prisma.standard.create({
        data: {
          framework: 'NGSS',
          code: 'UNIQUE-TEST',
          description: 'First standard',
          gradeLevel: 3
        }
      });

      await expect(
        prisma.standard.create({
          data: {
            framework: 'NGSS',
            code: 'UNIQUE-TEST',
            description: 'Duplicate standard',
            gradeLevel: 3
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Lesson Model', () => {
    it('should create a lesson with basic fields', async () => {
      const lesson = await prisma.lesson.create({
        data: {
          title: 'Test Lesson',
          description: 'Test lesson description',
          gradeLevel: 3,
          order: 1
        }
      });

      expect(lesson.title).toBe('Test Lesson');
      expect(lesson.gradeLevel).toBe(3);
      expect(lesson.order).toBe(1);
    });
  });

  describe('CurriculumUnit Model', () => {
    it('should create a curriculum unit', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-3',
          email: 'teacher3@example.com',
          name: 'Teacher 3',
          username: 'teacher3',
          displayUsername: 'Teacher3',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const classRecord = await prisma.class.create({
        data: {
          name: 'Test Class for Unit',
          gradeLevel: 3,
          standardsAlignment: 'NGSS',
          teacherId: teacher.id,
          joinCode: nextJoinCode(),
        }
      });

      const unit = await prisma.curriculumUnit.create({
        data: {
          title: 'Test Unit',
          description: 'Test unit description',
          framework: 'NGSS',
          gradeLevel: 3,
          order: 1,
          classId: classRecord.id
        }
      });

      expect(unit.title).toBe('Test Unit');
      expect(unit.framework).toBe('NGSS');
      expect(unit.classId).toBe(classRecord.id);
    });
  });

  describe('Relationships', () => {
    it('should create user-class relationship (teacher-students)', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-rel',
          email: 'teacher-rel@example.com',
          name: 'Teacher Relationship',
          username: 'teacherrel',
          displayUsername: 'TeacherRel',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const student = await prisma.user.create({
        data: {
          id: 'student-rel',
          email: 'student-rel@example.com',
          name: 'Student Relationship',
          username: 'studentrel',
          displayUsername: 'StudentRel',
          role: 'STUDENT',
          gradeLevel: 3,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const classRecord = await prisma.class.create({
        data: {
          name: 'Relationship Test Class',
          gradeLevel: 3,
          standardsAlignment: 'NGSS',
          teacherId: teacher.id,
          students: {
            connect: [{ id: student.id }]
          },
          joinCode: nextJoinCode(),
        }
      });

      const classWithRelations = await prisma.class.findUnique({
        where: { id: classRecord.id },
        include: {
          teacher: true,
          students: true
        }
      });

      expect(classWithRelations?.teacher.id).toBe(teacher.id);
      expect(classWithRelations?.students).toHaveLength(1);
      expect(classWithRelations?.students[0].id).toBe(student.id);
    });

    it('should create lesson-standard many-to-many relationship', async () => {
      const standard1 = await prisma.standard.create({
        data: {
          framework: 'NGSS',
          code: 'NGSS-3-REL-1',
          description: 'Related standard 1',
          gradeLevel: 3
        }
      });

      const standard2 = await prisma.standard.create({
        data: {
          framework: 'NGSS',
          code: 'NGSS-3-REL-2',
          description: 'Related standard 2',
          gradeLevel: 3
        }
      });

      const lesson = await prisma.lesson.create({
        data: {
          title: 'Lesson with Standards',
          description: 'Lesson with multiple standards',
          gradeLevel: 3,
          order: 1,
          standards: {
            connect: [{ id: standard1.id }, { id: standard2.id }]
          }
        }
      });

      const lessonWithStandards = await prisma.lesson.findUnique({
        where: { id: lesson.id },
        include: { standards: true }
      });

      expect(lessonWithStandards?.standards).toHaveLength(2);
      expect(lessonWithStandards?.standards.map(s => s.code)).toContain('NGSS-3-REL-1');
      expect(lessonWithStandards?.standards.map(s => s.code)).toContain('NGSS-3-REL-2');
    });

    it('should create curriculumUnit-lesson many-to-many relationship', async () => {
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-unit-rel',
          email: 'teacher-unit@example.com',
          name: 'Teacher Unit Relationship',
          username: 'teacherunitel',
          displayUsername: 'TeacherUnitRel',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const classRecord = await prisma.class.create({
        data: {
          name: 'Class for Unit Relationship',
          gradeLevel: 3,
          standardsAlignment: 'NGSS',
          teacherId: teacher.id,
          joinCode: nextJoinCode(),
        }
      });

      const lesson1 = await prisma.lesson.create({
        data: {
          title: 'Lesson 1 for Unit',
          gradeLevel: 3,
          order: 1
        }
      });

      const lesson2 = await prisma.lesson.create({
        data: {
          title: 'Lesson 2 for Unit',
          gradeLevel: 3,
          order: 2
        }
      });

      const unit = await prisma.curriculumUnit.create({
        data: {
          title: 'Unit with Multiple Lessons',
          framework: 'NGSS',
          gradeLevel: 3,
          order: 1,
          classId: classRecord.id,
          lessons: {
            connect: [{ id: lesson1.id }, { id: lesson2.id }]
          }
        }
      });

      const unitWithLessons = await prisma.curriculumUnit.findUnique({
        where: { id: unit.id },
        include: { lessons: true }
      });

      expect(unitWithLessons?.lessons).toHaveLength(2);
      expect(unitWithLessons?.lessons.map(l => l.title)).toContain('Lesson 1 for Unit');
      expect(unitWithLessons?.lessons.map(l => l.title)).toContain('Lesson 2 for Unit');
    });
  });

  describe('Complex Nested Queries', () => {
    it('should handle complex nested relationships', async () => {
      // Create comprehensive test data
      const teacher = await prisma.user.create({
        data: {
          id: 'teacher-complex',
          email: 'teacher-complex@example.com',
          name: 'Complex Test Teacher',
          username: 'teachercomplex',
          displayUsername: 'TeacherComplex',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const student = await prisma.user.create({
        data: {
          id: 'student-complex',
          email: 'student-complex@example.com',
          name: 'Complex Test Student',
          username: 'studentcomplex',
          displayUsername: 'StudentComplex',
          role: 'STUDENT',
          gradeLevel: 3,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const classRecord = await prisma.class.create({
        data: {
          name: 'Complex Test Class',
          gradeLevel: 3,
          standardsAlignment: 'NGSS',
          teacherId: teacher.id,
          students: {
            connect: [{ id: student.id }]
          },
          joinCode: nextJoinCode(),
        }
      });

      const standard = await prisma.standard.create({
        data: {
          framework: 'NGSS',
          code: 'NGSS-3-COMPLEX',
          description: 'Complex test standard',
          gradeLevel: 3
        }
      });

      const lesson = await prisma.lesson.create({
        data: {
          title: 'Complex Lesson',
          description: 'Complex lesson description',
          gradeLevel: 3,
          order: 1,
          standards: {
            connect: [{ id: standard.id }]
          }
        }
      });

      const unit = await prisma.curriculumUnit.create({
        data: {
          title: 'Complex Unit',
          framework: 'NGSS',
          gradeLevel: 3,
          order: 1,
          classId: classRecord.id,
          lessons: {
            connect: [{ id: lesson.id }]
          }
        }
      });

      // Test complex nested query
      const complexQuery = await prisma.class.findUnique({
        where: { id: classRecord.id },
        include: {
          teacher: true,
          students: true,
          curriculumUnits: {
            include: {
              lessons: {
                include: {
                  standards: true
                }
              }
            }
          }
        }
      });

      expect(complexQuery).toBeDefined();
      expect(complexQuery?.teacher.name).toBe('Complex Test Teacher');
      expect(complexQuery?.students).toHaveLength(1);
      expect(complexQuery?.curriculumUnits).toHaveLength(1);
      expect(complexQuery?.curriculumUnits[0]?.lessons).toHaveLength(1);
      expect(complexQuery?.curriculumUnits[0]?.lessons[0]?.standards).toHaveLength(1);
      expect(complexQuery?.curriculumUnits[0]?.lessons[0]?.standards[0]?.code).toBe('NGSS-3-COMPLEX');
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key constraint for class teacher', async () => {
      await expect(
        prisma.class.create({
          data: {
            name: 'Invalid Class',
            gradeLevel: 3,
            standardsAlignment: 'NGSS',
            teacherId: 'non-existent-teacher-id',
            joinCode: nextJoinCode(),
          }
        })
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraint for curriculum unit class', async () => {
      await expect(
        prisma.curriculumUnit.create({
          data: {
            title: 'Invalid Unit',
            framework: 'NGSS',
            gradeLevel: 3,
            order: 1,
            classId: 'non-existent-class-id'
          }
        })
      ).rejects.toThrow();
    });
  });
});
