import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db, and, eq } from "@reading-advantage/db";
import { classrooms, classroomTeachers } from "@reading-advantage/db/schema";
import { Role } from "@/lib/enums";
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
  const [classroom] = await db
    .select()
    .from(classrooms)
    .where(eq(classrooms.id, classroomId))
    .limit(1);

  if (!classroom) {
    return redirect("/th/teacher/dashboard");
  }

  // Verify access
  if (user.role !== Role.SYSTEM && user.role !== Role.ADMIN) {
    const [classroomTeacher] = await db
      .select()
      .from(classroomTeachers)
      .where(
        and(
          eq(classroomTeachers.classroomId, classroomId),
          eq(classroomTeachers.teacherId, user.id),
        ),
      )
      .limit(1);

    if (!classroomTeacher) {
      return redirect("/th/teacher/dashboard");
    }
  }
  const t = await getScopedI18n("pages.teacher.classdetail");

  return (
    <div className="container mx-auto p-6">
      <ClassDetailDashboard
        classroomId={classroomId}
        className={classroom.name || t("unnamedClass")}
        classCode={classroom.classCode || t("na")}
      />
    </div>
  );
}
