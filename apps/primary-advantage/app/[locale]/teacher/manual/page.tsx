import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getLessonGuide, getTeacherBookSlots } from "@reading-advantage/domain/primary-books";
import { GuideSteps } from "@/components/teacher/guide-steps";
import { renderManualGuide } from "@/components/teacher/manual-guide";
import { TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";
import { currentUser } from "@/lib/session";
import { cn } from "@/lib/utils";

/**
 * Page title: the manual.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook");
  return { title: t("manual.title") };
}

/**
 * The class page of a teacher with exactly one class, for the manual's class links.
 * @returns The class page path, or null for none or several classes (or a failed read).
 */
async function singleClassPath(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const slots = await getTeacherBookSlots({ db, user }).catch(() => []);
  const ids = [...new Set(slots.map((slot) => slot.classroomId))];
  return ids.length === 1 ? `/teacher/class-roster/${ids[0]}` : null;
}

/**
 * The in-app teacher manual (FR-15, S5 request of 2026-10-20): the picture guide of the print kit
 * in six sections, then the 13 workbook steps with the imported guide, in the guide language of the
 * locale.
 * @returns The page.
 */
export default async function TeacherManualPage() {
  const locale = await getLocale();
  const [guide, t, manual] = await Promise.all([
    getLessonGuide({ db, locale }).catch(() => []),
    getTranslations("TeacherUi.classBook"),
    singleClassPath().then(renderManualGuide),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("manual.title")} description={t("manual.intro")} />
      {manual}
      <section id="steps" aria-labelledby="manual-steps" className={cn(TEACHER_CARD, "scroll-mt-24")}>
        <h2 id="manual-steps" className="text-lg font-semibold">
          {t("manual.stepsTitle")}
        </h2>
        <GuideSteps guide={guide} t={t} />
      </section>
    </div>
  );
}
