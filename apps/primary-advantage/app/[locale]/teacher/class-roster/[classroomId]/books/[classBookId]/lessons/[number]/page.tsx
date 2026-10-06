import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, PresentationIcon, UserRoundIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getLessonGuide, getTeacherLesson, type TeacherLesson } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";
import { Link, redirect } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GuideOverlay } from "@/components/teacher/guide-overlay";
import { GuideSteps } from "@/components/teacher/guide-steps";
import { TEACHER_ACTION, TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "@/components/teacher/teacher-shell";

type Params = Promise<{ classroomId: string; classBookId: string; number: string }>;

/**
 * Page title: the guide.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook");
  return { title: t("guide.title") };
}

/**
 * Reads the lesson; null when the class book is not the teacher's or the lesson is not in the catalogue.
 * @param user The signed-in teacher.
 * @param classBookId The class book.
 * @param number The lesson number.
 * @returns The lesson, or null.
 */
export async function loadTeacherLesson(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>, classBookId: string, number: number): Promise<TeacherLesson | null> {
  if (!Number.isInteger(number) || number < 1) return null;
  try {
    return await getTeacherLesson({ db, user, classBookId, number });
  } catch {
    return null;
  }
}

/**
 * A heading and a list of the answer key.
 * @param props.heading The heading.
 * @param props.children The list.
 * @returns The block.
 */
function KeyBlock({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-semibold">{heading}</h3>
      {children}
    </section>
  );
}

/**
 * The teacher lesson page (FR-8, FR-9, FR-12, FR-13): the live guide, the 13 steps in the four
 * periods in the guide language of the locale, the answer key (teachers only), and the lesson
 * summary; links to the projector and the rehearsal.
 * @param props.params The class, the class book, and the lesson number.
 * @returns The page.
 */
export default async function TeacherLessonPage({ params }: { params: Params }) {
  const { classroomId, classBookId, number: rawNumber } = await params;
  const number = Number(rawNumber);
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/auth/signin", locale });
  const [lesson, guide, t] = await Promise.all([loadTeacherLesson(user, classBookId, number), getLessonGuide({ db, locale }).catch(() => []), getTranslations("TeacherUi.classBook")]);
  if (!lesson) notFound();
  const base = `/teacher/class-roster/${classroomId}/books/${classBookId}`;
  const here = `${base}/lessons/${number}`;
  const { bank, activities } = lesson;
  const hasKey = bank.mcq.length > 0 || bank.saq.length > 0 || bank.laq.length > 0 || activities !== null;

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        title={`${t("lessonNumber", { number })} · ${lesson.lesson.title}`}
        description={lesson.classBook.bookName}
        back={
          <Link href={base} className={TEACHER_BACK_LINK}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("progress.backToPlan")}
          </Link>
        }
        actions={
          <>
            <Link href={`${here}/projector`} className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION)}>
              <PresentationIcon aria-hidden="true" />
              {t("lesson.projector")}
            </Link>
            {lesson.lesson.articleId ? (
              <Link href={`${here}/rehearsal`} className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION)}>
                <UserRoundIcon aria-hidden="true" />
                {t("lesson.rehearsal")}
              </Link>
            ) : null}
          </>
        }
      />
      {lesson.lesson.articleId ? null : <p className="text-muted-foreground text-sm">{t("lesson.noArticle")}</p>}

      <GuideOverlay classBookId={classBookId} lessonNumber={number} steps={guide.flatMap((group) => group.steps)} stepsDone={lesson.stepsDone} />

      <section aria-labelledby="lesson-guide" className={TEACHER_CARD}>
        <h2 id="lesson-guide" className="text-lg font-semibold">
          {t("guide.title")}
        </h2>
        <GuideSteps guide={guide} stepsDone={lesson.stepsDone} t={t} />
      </section>

      <section aria-labelledby="answer-key" className={TEACHER_CARD}>
        <h2 id="answer-key" className="text-lg font-semibold">
          {t("lesson.answerKey")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("lesson.teachersOnly")}</p>
        {hasKey ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {bank.mcq.length ? (
              <KeyBlock heading={t("lesson.mcq")}>
                <ol className="flex flex-col gap-3">
                  {bank.mcq.map((q, index) => (
                    <li key={q.id ?? index} className="flex flex-col gap-1">
                      <p className="font-medium">
                        {index + 1}. {q.question}
                      </p>
                      <ul className="grid gap-1 pl-4 sm:grid-cols-2">
                        {q.options.map((option) => (
                          <li key={option} className={option === q.answer ? "font-semibold text-green-800 dark:text-green-300" : "text-muted-foreground"}>
                            {option === q.answer ? "✓ " : ""}
                            {option}
                          </li>
                        ))}
                      </ul>
                      {q.evidence ? <p className="text-muted-foreground text-sm italic">{q.evidence}</p> : null}
                    </li>
                  ))}
                </ol>
              </KeyBlock>
            ) : null}
            {bank.saq.length ? (
              <KeyBlock heading={t("lesson.saq")}>
                <ol className="flex flex-col gap-2">
                  {bank.saq.map((q, index) => (
                    <li key={q.id ?? index}>
                      <p className="font-medium">
                        {index + 1}. {q.question}
                      </p>
                      {q.answer ? <p className="text-green-800 dark:text-green-300">{q.answer}</p> : null}
                    </li>
                  ))}
                </ol>
              </KeyBlock>
            ) : null}
            {bank.laq.length ? (
              <KeyBlock heading={t("lesson.laq")}>
                <ol className="list-decimal pl-5">
                  {bank.laq.map((q, index) => (
                    <li key={q.id ?? index}>{q.question}</li>
                  ))}
                </ol>
              </KeyBlock>
            ) : null}
            {activities?.vocabFill?.length ? (
              <KeyBlock heading={t("lesson.vocabFill")}>
                <ol className="list-decimal pl-5">
                  {activities.vocabFill.map((item) => (
                    <li key={item.sentence}>
                      {item.sentence} <span className="font-semibold text-green-800 dark:text-green-300">{item.answer}</span>
                    </li>
                  ))}
                </ol>
              </KeyBlock>
            ) : null}
            {activities?.sentenceOrder?.length ? (
              <KeyBlock heading={t("lesson.sentenceOrder")}>
                <ol className="list-decimal pl-5">
                  {activities.sentenceOrder.map((sentence) => (
                    <li key={sentence}>{sentence}</li>
                  ))}
                </ol>
              </KeyBlock>
            ) : null}
            {activities?.sentenceCompletion?.length ? (
              <KeyBlock heading={t("lesson.sentenceCompletion")}>
                <ul className="list-disc pl-5">
                  {activities.sentenceCompletion.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </KeyBlock>
            ) : null}
            {activities?.sentenceStarters?.length ? (
              <KeyBlock heading={t("lesson.sentenceStarters")}>
                <ul className="list-disc pl-5">
                  {activities.sentenceStarters.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </KeyBlock>
            ) : null}
            {activities?.writingPrompt || activities?.writingFrames?.length ? (
              <KeyBlock heading={t("lesson.writingPrompt")}>
                {activities.writingPrompt ? <p className="font-medium">{activities.writingPrompt}</p> : null}
                {activities.writingFrames?.length ? (
                  <ul className="list-disc pl-5">
                    {activities.writingFrames.map((frame) => (
                      <li key={frame}>{frame}</li>
                    ))}
                  </ul>
                ) : null}
                <h4 className="mt-2 text-sm font-semibold">{t("lesson.rubric")}</h4>
                <ul className="list-disc pl-5 text-sm">
                  <li>{t("lesson.rubric1")}</li>
                  <li>{t("lesson.rubric2")}</li>
                  <li>{t("lesson.rubric3")}</li>
                </ul>
              </KeyBlock>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("lesson.noKey")}</p>
        )}
      </section>

      {lesson.summary ? (
        <section aria-labelledby="lesson-summary" className={TEACHER_CARD}>
          <h2 id="lesson-summary" className="text-lg font-semibold">
            {t("lesson.summary")}
          </h2>
          <p>{lesson.summary}</p>
          {locale === "th" && lesson.thaiSummary ? <p lang="th">{lesson.thaiSummary}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
