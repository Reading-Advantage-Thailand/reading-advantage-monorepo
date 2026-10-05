import MyStudents from "@/components/teacher/my-students";
import { TeacherPageHeader } from "@/components/teacher/teacher-shell";
import { getTranslations } from "next-intl/server";

/**
 * My Students page: the teacher shell header and the student table.
 * @returns The page.
 */
export default async function MyStudentsPage() {
  const t = await getTranslations("teacher.myStudents");
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("title")} description={t("description")} />
      <MyStudents />
    </div>
  );
}
