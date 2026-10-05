import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";

export default async function SettingsPageLayout({ children }: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/settings"]);
  return (
    <AppLayout settings>
      {children}
    </AppLayout>
  );
}
