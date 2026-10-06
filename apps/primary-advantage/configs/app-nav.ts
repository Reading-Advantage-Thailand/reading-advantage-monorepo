import type { PageConfig } from "@/types";
import type { NavArea } from "@/lib/nav-area";
import { adminPageConfig } from "./admin-page-config";
import { studentPageConfig } from "./student-page-config";
import { systemPageConfig } from "./system-page-config";
import { teacherPageConfig } from "./teacher-page-config";

/** Navigation config for each signed-in area. */
export const areaConfigs: Record<NavArea, PageConfig> = {
  student: studentPageConfig,
  teacher: teacherPageConfig,
  admin: adminPageConfig,
  system: systemPageConfig,
};
