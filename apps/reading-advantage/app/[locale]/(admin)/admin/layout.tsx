import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { adminPageConfig } from "@/configs/admin-page-config";
import { Role } from "@/lib/enums";
import { requireRole } from "@/lib/auth-guard";

export default async function AdminLayout({ children }: BaseAppLayoutProps) {
  await requireRole([Role.SYSTEM, Role.ADMIN]);

  return (
    <AppLayout
      mainNavConfig={adminPageConfig.mainNav}
      sidebarNavConfig={adminPageConfig.sidebarNav}
      disableLeaderboard={true}
    >
      {children}
    </AppLayout>
  );
}
