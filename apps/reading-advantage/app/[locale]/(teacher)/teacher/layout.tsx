import { teacherPageConfig } from "@/configs/teacher-page-config";
import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { Role } from "@/lib/enums";
import { requireRole } from "@/lib/auth-guard";

export default async function TeacherHomeLayout({
  children,
}: BaseAppLayoutProps) {
  await requireRole([Role.SYSTEM, Role.TEACHER, Role.ADMIN]);

  return (
    <AppLayout
      mainNavConfig={teacherPageConfig.mainNav}
      sidebarNavConfig={teacherPageConfig.teacherSidebarNav}
      disableLeaderboard={true}
    >
      {children}
    </AppLayout>
  );
}
