import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { PreviewBanner } from "@/components/student/preview-banner";
import { StudentViewProvider } from "@/components/student/student-view-provider";
import { assertLayoutRole } from "@/lib/layout-guard";
import { protectedRoutes } from "@/lib/route-policies";
import { currentUser } from "@/lib/session";
import { roleHomeFor, studentViewModeFor } from "@/lib/student-view";

/**
 * The student pages layout. Students and staff (teacher, admin, system) open it. Staff get
 * preview mode and the banner; the mode comes from the session role only.
 * @param props The page content.
 * @returns The student shell.
 */
export default async function StudentPageLayout({
  children,
}: BaseAppLayoutProps) {
  await assertLayoutRole(protectedRoutes["/student"]);
  const user = await currentUser();
  const mode = studentViewModeFor(user?.role) ?? "student";
  return (
    <AppLayout area="student">
      <StudentViewProvider mode={mode}>
        {mode === "preview" ? <PreviewBanner exitHref={roleHomeFor(user?.role)} /> : null}
        {children}
      </StudentViewProvider>
    </AppLayout>
  );
}
