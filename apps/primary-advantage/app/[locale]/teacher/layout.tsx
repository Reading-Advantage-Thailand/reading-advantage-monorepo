import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";

export default async function TeacherHomeLayout({
  children,
}: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/teacher"]);
  return (
    <AppLayout area="teacher">
      {children}
    </AppLayout>
  );
}
