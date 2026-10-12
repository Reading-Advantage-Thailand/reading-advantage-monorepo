import { ChevronLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { getStoryForStudent } from "@reading-advantage/domain/stories";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/lib/session";
import { getStoryImageUrl } from "@/lib/storage-config";
import { cn } from "@/lib/utils";
import { GoToTop } from "@/components/go-to-top";
import { Panel, rpgButton } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { ChapterList } from "@/components/stories/chapter-list";
import { StoryCharacters } from "@/components/stories/story-characters";
import { StoryCover } from "@/components/stories/story-cover";

interface PageProps {
  params: Promise<{ storyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

const BADGE = "inline-flex items-center rounded-full border-2 border-[#8a6a3b] bg-[#f3e6c4] px-3 py-1 text-xs font-bold text-[#2a2117]";
const TAB_CLASS = "cq-sign cq-sign--small min-h-12 inline-flex items-center no-underline";

/** The text in the student's language, with the English text as the fallback. */
function localized(locale: string, text: string | null, translated: Record<string, string> | null): string | null {
  return (locale !== "en" && translated?.[locale]?.trim()) || text;
}

/**
 * Story page of Read (STU-04): the cover, the badges, the summary in the student's language, a
 * start button, and the signs "Chapters" and "Characters". A student sees a story only in the
 * level window (level +/- 1); a story outside it, an unpublished story, or a bad id gives 404.
 * Staff see every published story. The page writes nothing.
 * @param props.params The story id.
 * @param props.searchParams `tab=characters` shows the characters; the default is the chapters.
 * @returns The page.
 */
export default async function StoryPage({ params, searchParams }: PageProps) {
  const [{ storyId }, { tab }] = await Promise.all([params, searchParams]);
  const user = await currentUser();
  if (!user) notFound();

  const tenant = { schoolId: user.schoolId };
  let data;
  try {
    data = await getStoryForStudent({ db: createTenantDB(db, tenant), user, tenant, input: { storyId } });
  } catch (error) {
    if (error instanceof Error && (error.name === "StoryNotFoundError" || error.name === "ZodError")) notFound();
    throw error;
  }

  const [t, locale] = await Promise.all([getTranslations("Stories"), getLocale()]);
  const { story, chapters, finishedChapterIds, characters } = data;
  const finished = new Set(finishedChapterIds);
  const next = chapters.find((c) => !finished.has(c.id));
  const start = next ?? chapters[0];
  const showCharacters = tab === "characters";
  const summary = localized(locale, story.summary, story.translatedSummary);
  const href = (part: "chapters" | "characters") => `/student/read/stories/${story.id}${part === "characters" ? "?tab=characters" : ""}`;

  return (
    <Scene place="library">
      <Link href="/student/read/stories" className={cn(rpgButton("iron"), "w-fit min-h-12")}>
        <ChevronLeftIcon className="size-5" aria-hidden /> {t("backToShelf")}
      </Link>
      <Panel className="gap-4 md:flex-row md:items-start">
        <span className="relative flex aspect-[3/4] w-40 shrink-0 items-center justify-center self-center overflow-hidden rounded-md border-[3px] border-[#5c391a] bg-[#3b2410] shadow-[4px_0_0_#3b2410,0_8px_14px_rgba(0,0,0,.5)] md:w-56">
          <StoryCover src={getStoryImageUrl({ id: story.id, image: story.imageKey })} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 className="text-2xl font-bold md:text-3xl">{story.title}</h1>
          <div className="flex flex-wrap gap-2">
            {story.raLevel !== null ? <span className={BADGE}>{t("level", { level: story.raLevel })}</span> : null}
            {story.cefrLevel ? <span className={BADGE}>{t("cefr", { level: story.cefrLevel })}</span> : null}
            {story.genre ? <span className={BADGE}>{story.genre}</span> : null}
            <span className={BADGE}>{t("chapterCount", { count: chapters.length })}</span>
          </div>
          {summary ? <p className="leading-relaxed">{summary}</p> : null}
          {start ? (
            <Link href={`/student/read/stories/${story.id}/${start.chapterNumber}`} className={cn(rpgButton("gold"), "w-fit min-h-12")}>
              {next ? t("startChapter", { n: next.chapterNumber }) : t("readAgain")}
            </Link>
          ) : null}
        </div>
      </Panel>
      <nav aria-label={t("storyParts")} className="cq-signs">
        <Link href={href("chapters")} aria-current={showCharacters ? undefined : "page"} className={cn(TAB_CLASS, !showCharacters && "cq-sign--active")}>
          {t("chaptersSign")}
        </Link>
        <Link href={href("characters")} aria-current={showCharacters ? "page" : undefined} className={cn(TAB_CLASS, showCharacters && "cq-sign--active")}>
          {t("charactersSign")}
        </Link>
      </nav>
      <Panel>
        {showCharacters ? (
          <StoryCharacters characters={characters} />
        ) : (
          <ChapterList
            storyId={story.id}
            chapters={chapters.map((c) => ({
              id: c.id,
              chapterNumber: c.chapterNumber,
              title: c.title,
              summary: localized(locale, c.summary, c.translatedSummary),
              done: finished.has(c.id),
            }))}
          />
        )}
      </Panel>
      <GoToTop />
    </Scene>
  );
}
