import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { studentPageConfig } from "@/configs/student-page-config";

export default async function SettingsPageLayout({
  children,
}: BaseAppLayoutProps) {
  return (
    <AppLayout
      mainNavConfig={studentPageConfig.mainNav}
      sidebarNavConfig={studentPageConfig.sidebarNav}
    >
      {children}
    </AppLayout>
  );
}
