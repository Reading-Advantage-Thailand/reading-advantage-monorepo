import type { PageConfig } from "@/types";
import type { NavArea } from "@/lib/nav-area";
import { adminPageConfig } from "./admin-page-config";
import { studentPageConfig } from "./student-page-config";
import { systemPageConfig } from "./system-page-config";
import { teacherPageConfig } from "./teacher-page-config";

// Import this module from client components only: the student config reads STUDENT_HOME
// from a "use client" module, which a server component would get as a client reference.

/** Navigation config for each signed-in area. */
export const areaConfigs: Record<NavArea, PageConfig> = {
  student: studentPageConfig,
  teacher: teacherPageConfig,
  admin: adminPageConfig,
  system: systemPageConfig,
};
