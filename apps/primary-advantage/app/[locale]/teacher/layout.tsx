import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { teacherPageConfig } from "@/configs/teacher-page-config";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";

export default async function TeacherHomeLayout({
  children,
}: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/teacher"]);
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
