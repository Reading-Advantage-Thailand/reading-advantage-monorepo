import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { teacherPageConfig } from "@/configs/teacher-page-config";

export default async function TeacherHomeLayout({
  children,
}: BaseAppLayoutProps) {
  return (
    <AppLayout
      mainNavConfig={teacherPageConfig.mainNav}
      sidebarNavConfig={teacherPageConfig.sidebarNav}
      disableLeaderboard
    >
      {children}
    </AppLayout>
  );
}
