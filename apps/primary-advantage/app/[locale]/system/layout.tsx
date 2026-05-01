import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { systemPageConfig } from "@/configs/system-page-config";

export default async function SystemHomeLayout({
  children,
}: BaseAppLayoutProps) {
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
