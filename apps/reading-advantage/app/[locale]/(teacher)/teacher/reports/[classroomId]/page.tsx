import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { ClassDetailDashboard } from "@/components/dashboard/class-detail-dashboard";
import { getScopedI18n } from "@/locales/server";

export default async function ClassDetailReportsPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }

  // Get classroom data
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom) {
    return redirect("/th/teacher/dashboard");
  }

  // Verify access
  if (user.role !== Role.SYSTEM && user.role !== Role.ADMIN) {
    const classroomTeacher = await prisma.classroomTeacher.findFirst({
      where: {
        classroomId: classroomId,
        teacherId: user.id,
      },
    });

    if (!classroomTeacher) {
      return redirect("/th/teacher/dashboard");
    }
  }
  const t = await getScopedI18n("pages.teacher.classdetail");

  return (
    <div className="container mx-auto p-6">
      <ClassDetailDashboard
        classroomId={classroomId}
        className={classroom.classroomName || t("unnamedClass")}
        classCode={classroom.classCode || t("na")}
      />
    </div>
  );
}
