import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/session";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import TeacherProgressReports from "@/components/teacher/teacher-progress-reports";
import { fetchClassrooms } from "@/server/controllers/classroomController";
import { fetchStudentsByRole } from "@/server/controllers/classroomController";

export default async function ReportsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  // if (user.role !== "teacher" && user.role !== "system") {
  //   return <AuthErrorPage />;
  // }

  const t = await getTranslations("Reports");

  // Fetch teacher's classrooms and students
  const classroomsResponse = await fetchClassrooms();
  const studentsResponse = await fetchStudentsByRole();

  const classrooms =
    classroomsResponse instanceof Response
      ? (await classroomsResponse.json()).classrooms || []
      : [];

  const students =
    studentsResponse instanceof Response
      ? (await studentsResponse.json()).students || []
      : [];

  return (
    <div className="flex flex-col gap-4">
      <Header heading={t("title")} text={t("description")} />
      <TeacherProgressReports
        classrooms={classrooms}
        students={students}
        currentUser={user}
      />
    </div>
  );
}
