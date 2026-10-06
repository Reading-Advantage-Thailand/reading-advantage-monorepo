import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { challenges, createTenantDB } from "@reading-advantage/domain";
import { QUEST_TEMPLATES } from "@reading-advantage/domain/primary-quest";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";
import { AssignQuestForm } from "@/components/quest/assign-quest-form";
import { TEACHER_BACK_LINK, TeacherPageHeader } from "@/components/teacher/teacher-shell";

/**
 * Page title: assign a quest.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Quest.assign");
  return { title: t("title") };
}

/**
 * The teacher's assign page (FR-2): the template list, the teacher's classes, and the battle time.
 * @param props.searchParams The optional class to preselect.
 * @returns The page.
 */
export default async function AssignQuestPage({ searchParams }: { searchParams: Promise<{ classroomId?: string }> }) {
  const [{ classroomId }, user, t] = await Promise.all([searchParams, getCurrentUser(), getTranslations("Quest.assign")]);
  if (!user || !user.schoolId || (user.role !== "TEACHER" && user.role !== "ADMIN")) notFound();
  const tenant = { schoolId: user.schoolId };
  const { classes } = await challenges.listOwnedChallengeClasses({ db: createTenantDB(db, tenant), user, tenant, input: { limit: 50 } });
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        back={
          <Link href="/teacher/dashboard" className={TEACHER_BACK_LINK}>
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </Link>
        }
        title={t("title")}
        description={t("subtitle")}
      />
      <AssignQuestForm templates={QUEST_TEMPLATES.map((template) => ({ ...template, goals: [...template.goals] }))} classes={classes} defaultClassId={classroomId} />
    </div>
  );
}
