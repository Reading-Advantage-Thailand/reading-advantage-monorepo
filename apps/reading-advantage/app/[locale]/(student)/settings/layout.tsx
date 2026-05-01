import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { settingsPageConfig } from "@/configs/settings-page-config";

export default function SettingsPageLayout({ children }: BaseAppLayoutProps) {
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
