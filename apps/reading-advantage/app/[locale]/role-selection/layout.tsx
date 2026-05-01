import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { indexPageConfig } from "@/configs/index-page-config";

export default async function StudentHomeLayout({
  children,
}: BaseAppLayoutProps) {
  // Disable sidebar for Role Selection to avoid premature widget rendering
  return (
    <AppLayout
      disableSidebar={true}
      disableProgressBar={true}
      mainNavConfig={indexPageConfig.mainNav}
    >
      {children}
    </AppLayout>
  );
}
