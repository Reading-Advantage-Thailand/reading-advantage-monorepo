import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { teacherPageConfig } from "@/configs/teacher-page-config";
import AppLayout, { BaseAppLayoutProps } from "@/components/shared/app-layout";
import { Role } from "@prisma/client";

export default async function TeacherHomeLayout({
  children,
}: BaseAppLayoutProps) {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }
  if (new Date(user?.expired_date) < new Date() && user?.role !== Role.SYSTEM) {
    return redirect("/contact");
  }
  if (
    user?.role !== Role.SYSTEM &&
    user?.role !== Role.TEACHER &&
    user?.role !== Role.ADMIN
  ) {
    return redirect("/");
  }

  return (
    <AppLayout
      mainNavConfig={teacherPageConfig.mainNav}
      sidebarNavConfig={teacherPageConfig.teacherSidebarNav}
    >
      {children}
    </AppLayout>
  );
}
