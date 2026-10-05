"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, BarChart3, Mic, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TEACHER_ACTION, TEACHER_BACK_LINK, TeacherPageHeader } from "./teacher-shell";

/** Props of {@link ClassroomNavigation}. */
interface ClassroomNavigationProps {
  /** The class shown on the page. */
  classroom: {
    id: string;
    name: string;
    grade?: string;
    studentCount: number;
  };
  /** Shows the link back to the class list. */
  showBackButton?: boolean;
}

/**
 * Heading of the teacher class page: a link back to the class list, the class name (h1), the
 * student count and grade, and links to the class reports and the class settings. Every link is
 * a real link (keyboard and new tab work) with a 44 px tap target.
 * @param props The class and the back link switch.
 * @returns The class page header.
 */
export default function ClassroomNavigation({ classroom, showBackButton = true }: ClassroomNavigationProps) {
  const t = useTranslations("Teacher.ClassroomNavigation");
  const action = cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-4");

  return (
    <TeacherPageHeader
      back={
        showBackButton ? (
          <Link href="/teacher/class-roster" className={TEACHER_BACK_LINK}>
            <ArrowLeft aria-hidden="true" />
            {t("actions.backToClassrooms")}
          </Link>
        ) : undefined
      }
      title={classroom.name}
      description={
        <span className="flex flex-wrap gap-x-3">
          <span>{t("info.students", { count: classroom.studentCount })}</span>
          {classroom.grade ? <span>{t("info.grade", { grade: classroom.grade })}</span> : null}
        </span>
      }
      actions={
        <>
          <Link href={`/teacher/reports?classroomId=${classroom.id}`} className={action}>
            <BarChart3 aria-hidden="true" />
            {t("nav.reports")}
          </Link>
          <Link href={`/teacher/class-roster/${classroom.id}/reedy`} className={action}>
            <Mic aria-hidden="true" />
            {t("nav.reedy")}
          </Link>
          <Link href={`/teacher/my-classes?edit=${classroom.id}`} className={action}>
            <Settings aria-hidden="true" />
            {t("nav.settings")}
          </Link>
        </>
      }
    />
  );
}
