import { getTranslations } from "next-intl/server";
import { SwordsIcon } from "lucide-react";
import MyClasses from "@/components/teacher/my-classes";
import { TEACHER_ACTION, TeacherPageHeader } from "@/components/teacher/teacher-shell";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * My Classes page: the heading with a link to the class game challenges, and the class table.
 * @returns The page.
 */
export default async function MyClassesPage() {
  const [t, tc] = await Promise.all([getTranslations("TeacherMyClasses.page"), getTranslations("TeacherClass")]);
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Link href="/teacher/game-challenges" className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-4")}>
            <SwordsIcon aria-hidden="true" />
            {tc("challenges")}
          </Link>
        }
      />
      <MyClasses />
    </div>
  );
}
