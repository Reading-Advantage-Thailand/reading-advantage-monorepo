import { getTranslations } from "next-intl/server";
import { BookLinkFrame } from "@/components/book-link/book-link-case";
import { RpgLink, Sign } from "@/components/rpg/chrome";
import type { BookLinkOutcome } from "@/lib/book-link/open-book-link";

type Translate = (key: string, values?: Record<string, string | number>) => string;
type LandingProps = Omit<Extract<BookLinkOutcome, { type: "landing" }>, "type">;

const CHOICE = "flex-col items-start !h-auto py-2 text-left";

/**
 * The view of the signed-out landing: the book name, the lesson line, the question, and the
 * choices. The school choice comes first and goes to sign-in with the callback; the Tutor choice
 * shows only when there is a Tutor link. The page shows no private data (spec S2).
 * @param props The translate function and the landing data from `openBookLink`.
 * @returns The landing page.
 */
export function BookLandingView({ t, bookName, title, number, writing, signInHref, tutorHref }: LandingProps & { t: Translate }) {
  return (
    <BookLinkFrame bubble={t(writing ? "bubbleWrite" : "bubbleRead")}>
      <div className="flex flex-col gap-3" data-landing>
        <div className="flex flex-col gap-1">
          <Sign small>{bookName}</Sign>
          <h1 className="text-xl font-bold">{t("lessonLine", { number, title })}</h1>
          {writing && <p className="text-sm">{t("writingTask")}</p>}
        </div>
        <p className="text-base font-semibold">{t("landingQuestion")}</p>
        <div className="flex flex-col gap-2">
          <RpgLink tone="gold" href={signInHref} className={CHOICE}>
            <span className="font-bold">{t("choiceSchool")}</span>
            <span className="text-sm font-normal">{t("choiceSchoolHint")}</span>
          </RpgLink>
          {tutorHref && (
            <RpgLink tone="wood" href={tutorHref} className={CHOICE}>
              <span className="font-bold">{t("choiceTutor")}</span>
              <span className="text-sm font-normal">{t("choiceTutorHint")}</span>
            </RpgLink>
          )}
        </div>
      </div>
    </BookLinkFrame>
  );
}

/**
 * The signed-out landing of a `/b/` address (spec S2). It reads the `BookLink` messages.
 * @param props The landing data from `openBookLink`.
 * @returns The landing page.
 */
export async function BookLanding(props: LandingProps) {
  const t = await getTranslations("BookLink");
  return <BookLandingView {...props} t={(key, values) => t(key as never, values as never)} />;
}
