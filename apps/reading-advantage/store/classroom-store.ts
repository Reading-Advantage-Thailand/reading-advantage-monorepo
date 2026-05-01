import { create } from "zustand";
import { persist } from "zustand/middleware";
import { classroom_v1 } from "googleapis";

interface CourseStore {
  courses: classroom_v1.Schema$Course[];
  selectedCourses: classroom_v1.Schema$Course[];
  setCourses: (courses: classroom_v1.Schema$Course[]) => void;
  setSelectedCourses: (selected: classroom_v1.Schema$Course[]) => void;
}

interface Classes {
  classroomName: string;
  classCode: string;
  noOfStudents: number;
  grade: string;
  coTeacher: {
    coTeacherId: string;
    name: string;
  };
  id: string;
  archived: boolean;
  title: string;
  student: {
    studentId: string;
    email?: string;
    lastActivity: Date | string;
  }[];
  importedFromGoogle: boolean;
  alternateLink: string;
  googleClassroomId?: string;
}

export type { Classes };

type StudentData = {
  id: string;
  display_name: string;
  email: string;
  last_activity: string;
  level: number;
  xp: number;
};

interface ClassroomState {
  classes: Classes;
  selectedClassroom: string;
  studentInClass: StudentData[];
  setClasses: (classes: Classes) => void;
  setSelectedClassroom: (classroom: string) => void;
  setStudentInClass: (students: StudentData[]) => void;
}

interface ClassroomStore {
  classrooms: Classes[];
  setClassrooms: (classrooms: Classes[]) => void;
  fetchClassrooms: () => Promise<void>;
}

export const useClassroomStore = create<ClassroomStore>((set) => ({
  classrooms: [],
  setClassrooms: (classrooms) => set({ classrooms }),
  fetchClassrooms: async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch ClassesData list");
    const fetchdata = await res.json();
    set({ classrooms: fetchdata.data });
  },
}));

export const useCourseStore = create<CourseStore>((set) => ({
  courses: [],
  selectedCourses: [],
  setCourses: (courses) => set({ courses }),
  setSelectedCourses: (selected) => set({ selectedCourses: selected }),
}));

// export const useCourseStore = create(
//   persist<CourseStore>(
//     (set) => ({
//       courses: [],
//       selectedCourses: [],
//       setCourses: (courses) => set({ courses }),
//       setSelectedCourses: (selected) => set({ selectedCourses: selected }),
//     }),
//     { name: "classroom-store" } // Stores in localStorage
//   )
// );

export const useClassroomState = create<ClassroomState>((set) => ({
  classes: {} as Classes,
  selectedClassroom: "",
  studentInClass: [],
  setClasses: (classes) => set({ classes }),
  setSelectedClassroom: (classroom) => set({ selectedClassroom: classroom }),
  setStudentInClass: (students) => set({ studentInClass: students }),
}));
