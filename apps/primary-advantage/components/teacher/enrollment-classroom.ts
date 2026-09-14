import type { Student } from "@/types";

/** Classroom shape used by the enrollment page client. */
export interface EnrollmentClassroom {
  id: string;
  name: string;
  teacherId: string;
  grade?: string | null;
  classCode?: string | null;
  students: Array<{
    id: string;
    student: Student;
  }>;
}

/** Classroom payload returned by getClassroomWithStudents and its API route. */
export interface ClassroomPayload {
  classroom: {
    id: string;
    classroomName: string | null;
    classCode?: string | null;
    grade?: number | string | null;
    teacherId?: string | null;
  };
  studentInClass: Array<{
    id: string;
    display_name: string | null;
    email: string | null;
    level?: number | null;
    xp?: number | null;
    cefrLevel?: string | null;
  }>;
}

/**
 * Adapts a classroom payload to the enrollment page shape.
 * @param payload The classroom payload, or null when inaccessible.
 * @returns The enrollment classroom, or null when there is no payload.
 */
export function adaptClassroomPayload(
  payload: ClassroomPayload | null,
): EnrollmentClassroom | null {
  if (!payload?.classroom) {
    return null;
  }

  return {
    id: payload.classroom.id,
    name: payload.classroom.classroomName ?? "",
    teacherId: payload.classroom.teacherId ?? "",
    grade:
      payload.classroom.grade != null
        ? String(payload.classroom.grade)
        : undefined,
    classCode: payload.classroom.classCode ?? undefined,
    students: (payload.studentInClass ?? []).map((entry) => ({
      id: entry.id,
      student: {
        id: entry.id,
        name: entry.display_name,
        email: entry.email,
        cefrLevel: entry.cefrLevel ?? null,
        level: entry.level ?? undefined,
        xp: entry.xp ?? undefined,
      },
    })),
  };
}
