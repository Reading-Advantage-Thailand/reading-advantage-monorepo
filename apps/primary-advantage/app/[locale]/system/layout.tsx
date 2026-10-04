import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";

export default async function SystemHomeLayout({
  children,
}: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/system"]);
  return (
    <AppLayout area="system" disableLeaderboard>
      {children}
    </AppLayout>
  );
}
