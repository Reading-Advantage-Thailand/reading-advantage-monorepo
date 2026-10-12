import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/configs/site-config";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { Bubble, Panel, RpgLink } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { Sprite } from "@/components/rpg/sprite";
import type { BookLinkOutcome } from "@/lib/book-link/open-book-link";

const HOST = "/rpg/kit/npc/quest-giver-idle-strip.png";

type Translate = (key: string, values?: Record<string, string | number>) => string;
type CaseProps = Omit<Extract<BookLinkOutcome, { type: "case" }>, "type">;

/** The message key prefix, the bubble, and the button of each case page (design.md). */
const CASES = {
  "unknown-book": { key: "unknownBook" },
  "no-lesson": { key: "noLesson" },
  "not-ready": { key: "notReady", bubble: "bubbleNotYet" },
  "no-class": { key: "noClass", button: "toClasses", tone: "gold" },
  "teacher-only": { key: "teacherOnly" },
  "wrong-account": { key: "wrongAccount" },
  "unknown-address": { key: "unknownAddress", button: "toStart" },
  retry: { key: "retry", bubble: "bubbleOops", button: "retry", tone: "gold" },
} as const;

/**
 * The frame of a `/b/` page: the library scene, the brand line with the language menu, and one
 * parchment panel with the quest-giver and a speech bubble (design.md, "Frame").
 * @param props.bubble The short word in the speech bubble.
 * @param props.children The content column.
 * @returns The framed page.
 */
export function BookLinkFrame({ bubble, children }: { bubble: string; children: React.ReactNode }) {
  return (
    <Scene place="library" className="min-h-screen px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <span className="cq-on-scene text-lg font-bold">{siteConfig.name}</span>
        <div className="cq-on-scene">
          <LocaleSwitcher />
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <Panel className="w-full max-w-md" data-book-link>
          <div className="flex items-center gap-3">
            <Sprite src={HOST} size={72} className="shrink-0" />
            <Bubble>{bubble}</Bubble>
          </div>
          {children}
        </Panel>
      </div>
    </Scene>
  );
}

/**
 * The view of one case page: a heading that is an alert, one or two sentences, and one button.
 * @param props The case, the translate function, the role home, and the data of the case.
 * @returns The case page.
 */
export function BookLinkCaseView({ t, name, homeHref, bookName = "", lessonCount = 0, retryHref = "/" }: CaseProps & { t: Translate }) {
  const spec: { key: string; bubble?: string; button?: string; tone?: "gold" | "iron" } = CASES[name];
  const href = name === "retry" ? retryHref : name === "unknown-address" ? "/" : homeHref;
  return (
    <BookLinkFrame bubble={t(spec.bubble ?? "bubbleOhNo")}>
      <div className="flex flex-col gap-3" data-case={name}>
        <h1 className="text-xl font-bold" role="alert">{t(`${spec.key}Title`)}</h1>
        <p className="text-base">{t(`${spec.key}Body`, { book: bookName, count: lessonCount })}</p>
        <div className="flex flex-col gap-2">
          <RpgLink tone={spec.tone ?? "iron"} href={href}>{t(spec.button ?? "toHome")}</RpgLink>
        </div>
      </div>
    </BookLinkFrame>
  );
}

/**
 * The case page of a `/b/` address that is not the normal one (spec S4). It reads the `BookLink` messages.
 * @param props The case and its data from `openBookLink`.
 * @returns The case page.
 */
export async function BookLinkCase(props: CaseProps) {
  const t = await getTranslations("BookLink");
  return <BookLinkCaseView {...props} t={(key, values) => t(key as never, values as never)} />;
}
