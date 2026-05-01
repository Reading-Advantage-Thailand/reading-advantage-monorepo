export interface ClassroomTeacher {
  id: string;
  teacherId: string;
  classroomId: string;
  role: "OWNER" | "CO_TEACHER";
  createdAt: Date;
  teacher: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ClassroomWithTeachers {
  id: string;
  classroomName: string | null;
  classCode: string | null;
  grade: number | null;
  archived: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  creator: {
    id: string;
    name: string | null;
  };
  teachers: ClassroomTeacher[];
  students: Array<{
    studentId: string;
    email: string | null;
    lastActivity: Date;
  }>;
}

export interface AddCoTeacherRequest {
  teacherEmail: string;
  role?: "CO_TEACHER";
}

export interface RemoveCoTeacherRequest {
  teacherId: string;
}

export interface ClassroomTeachersResponse {
  classroomId: string;
  teachers: Array<{
    id: string;
    name: string | null;
    email: string;
    role: "OWNER" | "CO_TEACHER";
    joined_at: Date;
    is_creator: boolean;
  }>;
}
