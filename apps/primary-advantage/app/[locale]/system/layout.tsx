import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { systemPageConfig } from "@/configs/system-page-config";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";

export default async function SystemHomeLayout({
  children,
}: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/system"]);
  return (
    <AppLayout
      mainNavConfig={systemPageConfig.mainNav}
      sidebarNavConfig={systemPageConfig.sidebarNav}
      disableLeaderboard
    >
      {children}
    </AppLayout>
  );
}
