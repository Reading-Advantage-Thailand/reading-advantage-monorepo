import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { settingsPageConfig } from "@/configs/settings-page-config";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";

export default async function SettingsPageLayout({ children }: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/settings"]);
  return (
    <AppLayout
      mainNavConfig={settingsPageConfig.mainNav}
      sidebarNavConfig={settingsPageConfig.sidebarNav}
      disableLeaderboard={true}
    >
      {children}
    </AppLayout>
  );
}
