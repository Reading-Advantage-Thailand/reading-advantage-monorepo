import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { adminPageConfig } from "@/configs/admin-page-config";

export default async function AdminHomeLayout({
  children,
}: BaseAppLayoutProps) {
  return (
    <AppLayout
      mainNavConfig={adminPageConfig.mainNav}
      sidebarNavConfig={adminPageConfig.sidebarNav}
      disableLeaderboard
    >
      {children}
    </AppLayout>
  );
}
