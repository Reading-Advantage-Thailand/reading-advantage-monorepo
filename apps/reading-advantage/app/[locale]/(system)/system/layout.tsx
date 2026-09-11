import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { systemPageConfig } from "@/configs/system-page-config";
import { Role } from "@/lib/enums";
import { requireRole } from "@/lib/auth-guard";

export default async function LevelPageLayout({
  children,
}: BaseAppLayoutProps) {
  await requireRole([Role.SYSTEM]);

  return (
    <AppLayout
      disableProgressBar={true}
      mainNavConfig={systemPageConfig.mainNav}
      sidebarNavConfig={systemPageConfig.systemSidebarNav}
      disableLeaderboard={true}
    >
      {children}
    </AppLayout>
  );
}
