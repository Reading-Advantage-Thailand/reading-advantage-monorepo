import { getTranslations } from "next-intl/server";
import ClassroomSelector from "@/components/teacher/classroom-selector";
import { TeacherPageHeader } from "@/components/teacher/teacher-shell";

/**
 * Class roster index page: the heading and a card per class.
 * @returns The page.
 */
export default async function ClassRosterPage() {
  const t = await getTranslations("Teacher.ClassRoster");
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("title")} description={t("description")} />
      <ClassroomSelector />
    </div>
  );
}
