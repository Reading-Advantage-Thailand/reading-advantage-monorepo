import { redirect } from "next/navigation";
import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { studentPageConfig } from "@/configs/student-page-config";
import { assertActiveSubscription, requireUser } from "@/lib/auth-guard";
import { AssignmentNotificationPopup } from "@/components/student/assignment-notification-popup";

export default async function SettingsPageLayout({
  children,
}: BaseAppLayoutProps) {
  const user = await requireUser();

  if (user.cefr_level === "" && user.level === 0) {
    return redirect("/level");
  }

  assertActiveSubscription(user);

  return (
    <AppLayout
      mainNavConfig={studentPageConfig.mainNav}
      sidebarNavConfig={studentPageConfig.sidebarNav}
    >
      {children}
      <AssignmentNotificationPopup userId={user.id} />
    </AppLayout>
  );
}
