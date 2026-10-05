import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getLessonGuide } from "@reading-advantage/domain/primary-books";
import { GuideSteps } from "@/components/teacher/guide-steps";
import { TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

/**
 * Page title: the manual.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook");
  return { title: t("manual.title") };
}

/**
 * The in-app teacher manual (FR-15): a short how-to for a first lesson and the 13 workbook steps
 * with the imported guide, in the guide language of the locale.
 * @returns The page.
 */
export default async function TeacherManualPage() {
  const locale = await getLocale();
  const [guide, t] = await Promise.all([getLessonGuide({ db, locale }).catch(() => []), getTranslations("TeacherUi.classBook")]);
  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader title={t("manual.title")} description={t("manual.intro")} />
      <section aria-labelledby="manual-howto" className={TEACHER_CARD}>
        <h2 id="manual-howto" className="text-lg font-semibold">
          {t("manual.howTo")}
        </h2>
        <ol className="list-decimal space-y-1 pl-5">
          {(["manual.howTo1", "manual.howTo2", "manual.howTo3", "manual.howTo4", "manual.howTo5"] as const).map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="manual-steps" className={TEACHER_CARD}>
        <h2 id="manual-steps" className="text-lg font-semibold">
          {t("manual.stepsTitle")}
        </h2>
        <GuideSteps guide={guide} t={t} />
      </section>
    </div>
  );
}
