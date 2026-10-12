import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon } from "lucide-react";
import { db } from "@reading-advantage/db";
import { getPrintLesson } from "@reading-advantage/domain/primary-books";
import { renderPrintLesson } from "@reading-advantage/domain/primary-books/print";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { logger } from "@/lib/observability/logger";
import { Bubble, Panel, RpgLink, Sign } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { Sprite } from "@/components/rpg/sprite";
import { PrintLessonFrame } from "@/components/teacher/print-lesson-frame";
import { loadTeacherLesson } from "../page";

type Params = Promise<{ classroomId: string; classBookId: string; number: string }>;

/**
 * Page title: print this lesson.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TeacherUi.classBook.lesson");
  return { title: t("print") };
}

/**
 * The print page of one lesson (S4): a sandboxed preview of the Workbooks template and a Print
 * button. A lesson without print data shows the "not ready" text. A user who may not manage the
 * class gets the same not-found page as the lesson page.
 * @param props.params The class, the class book, and the lesson number.
 * @returns The page.
 */
export default async function PrintLessonPage({ params }: { params: Params }) {
  const { classroomId, classBookId, number: rawNumber } = await params;
  const number = Number(rawNumber);
  const user = await currentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/auth/signin", locale });
  const lesson = await loadTeacherLesson(user, classBookId, number);
  if (!lesson) notFound();
  const t = await getTranslations("TeacherUi.classBook.lesson");
  const backHref = `/teacher/class-roster/${classroomId}/books/${classBookId}/lessons/${number}`;
  const title = lesson.lesson.title;

  let html: string | null = null;
  if (lesson.hasPrint) {
    try {
      const print = await getPrintLesson({ db, user, classBookId, number });
      html = print ? renderPrintLesson({ printLesson: print.printLesson, locale: locale as never }) : null;
    } catch (error) {
      logger.error("print_lesson_failed", { classBookId, number, userId: user.id, error });
      notFound();
    }
  }

  return (
    <Scene place="library" className="min-h-screen px-4 py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Sign>{title}</Sign>
        </div>
        <h1 className="sr-only">{title}</h1>
        {html ? (
          <PrintLessonFrame
            html={html}
            backHref={backHref}
            labels={{ frameTitle: t("printFrameTitle"), printNow: t("printNow"), loading: t("printLoading"), bubbleWait: t("printBubbleWait"), bubbleReady: t("printBubbleReady"), hint: t("printHint"), back: t("backToLesson") }}
          />
        ) : (
          <Panel className="w-full" data-print-page>
            <div className="flex items-center gap-3">
              <Sprite src="/rpg/kit/npc/quest-giver-idle-strip.png" size={72} className="shrink-0" />
              <Bubble>{t("printBubbleNotYet")}</Bubble>
            </div>
            <div role="alert" className="flex flex-col gap-2">
              <h2 className="text-xl font-bold">{t("printNotReadyTitle")}</h2>
              <p>{t("printNotReadyBody")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RpgLink tone="iron" href={backHref}>
                <ArrowLeftIcon aria-hidden="true" className="size-5" />
                {t("backToLesson")}
              </RpgLink>
            </div>
          </Panel>
        )}
      </div>
    </Scene>
  );
}
