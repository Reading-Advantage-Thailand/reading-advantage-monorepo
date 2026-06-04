/**
 * 2-School Acceptance Test Fixture (Track 2: TenantDB Adoption)
 *
 * Creates two isolated schools with teachers, classes, students, and data.
 * Used by the 2-school acceptance test to verify cross-school isolation.
 */

export const schoolA = {
  id: "school-a-id-00000000-0000-0000-0000",
  name: "School A",
  district: "District A",
  province: "Bangkok",
  country: "Thailand",
};

export const schoolB = {
  id: "school-b-id-00000000-0000-0000-0000",
  name: "School B",
  district: "District B",
  province: "Chiang Mai",
  country: "Thailand",
};

export const teacherA = {
  id: "teacher-a-id",
  name: "Teacher A",
  email: "teachera@schoola.com",
  role: "TEACHER" as const,
  schoolId: schoolA.id,
};

export const teacherB = {
  id: "teacher-b-id",
  name: "Teacher B",
  email: "teacherb@schoolb.com",
  role: "TEACHER" as const,
  schoolId: schoolB.id,
};

export const studentA = {
  id: "student-a-id",
  name: "Student A",
  email: "studenta@schoola.com",
  role: "STUDENT" as const,
  schoolId: schoolA.id,
};

export const studentB = {
  id: "student-b-id",
  name: "Student B",
  email: "studentb@schoolb.com",
  role: "STUDENT" as const,
  schoolId: schoolB.id,
};

export const classA = {
  id: "class-a-id-00000000-0000-0000-0000",
  name: "Class A",
  gradeLevel: 5,
  standardsAlignment: "NGSS",
  joinCode: "CODEA1",
  teacherId: teacherA.id,
  schoolId: schoolA.id,
};

export const classB = {
  id: "class-b-id-00000000-0000-0000-0000",
  name: "Class B",
  gradeLevel: 6,
  standardsAlignment: "NGSS",
  joinCode: "CODEB1",
  teacherId: teacherB.id,
  schoolId: schoolB.id,
};

export const lessonA = {
  id: "lesson-a-id-00000000-0000-0000-0000",
  slug: "lesson-a",
  title: "Lesson A",
  lessonType: "LESSON",
  gradeLevel: 5,
  order: 1,
  schoolId: schoolA.id,
};

export const lessonB = {
  id: "lesson-b-id-00000000-0000-0000-0000",
  slug: "lesson-b",
  title: "Lesson B",
  lessonType: "LESSON",
  gradeLevel: 6,
  order: 1,
  schoolId: schoolB.id,
};

export const attemptA = {
  id: "attempt-a-id-00000000-0000-0000-0000",
  studentId: studentA.id,
  lessonId: lessonA.id,
  schoolId: schoolA.id,
  score: 8,
  maxScore: 10,
  attemptNumber: 1,
};

export const attemptB = {
  id: "attempt-b-id-00000000-0000-0000-0000",
  studentId: studentB.id,
  lessonId: lessonB.id,
  schoolId: schoolB.id,
  score: 7,
  maxScore: 10,
  attemptNumber: 1,
};

export const responseA = {
  id: "response-a-id-00000000-0000-0000-0000",
  attemptId: attemptA.id,
  questionId: "question-a-id",
  studentAnswer: "A",
  isCorrect: true,
  timeSpentSeconds: 30,
  schoolId: schoolA.id,
};

export const responseB = {
  id: "response-b-id-00000000-0000-0000-0000",
  attemptId: attemptB.id,
  questionId: "question-b-id",
  studentAnswer: "B",
  isCorrect: true,
  timeSpentSeconds: 45,
  schoolId: schoolB.id,
};

export const masteryA = {
  studentId: studentA.id,
  standardId: "standard-a-id",
  schoolId: schoolA.id,
  masteryLevel: "0.85",
  evidenceCount: 3,
  lastAssessedAt: new Date(),
};

export const masteryB = {
  studentId: studentB.id,
  standardId: "standard-b-id",
  schoolId: schoolB.id,
  masteryLevel: "0.70",
  evidenceCount: 2,
  lastAssessedAt: new Date(),
};

/** Tenant contexts for test assertions. */
export const tenantA = { schoolId: schoolA.id };
export const tenantB = { schoolId: schoolB.id };
