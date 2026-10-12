import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { getChapterForStudent, getStoryForStudent } from "@reading-advantage/domain/stories";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/lib/session";
import { getChapterImageUrl } from "@/lib/storage-config";
import { cn } from "@/lib/utils";
import WordList from "@/components/articles/word-list";
import { GoToTop } from "@/components/go-to-top";
import { Panel, rpgButton } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { ChapterContent } from "@/components/stories/chapter-content";
import { ChapterQuestions } from "@/components/stories/chapter-questions";
import type { WordListTimestamp } from "@/types";

interface PageProps {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}

const BADGE = "inline-flex items-center rounded-full border-2 border-[#8a6a3b] bg-[#f3e6c4] px-3 py-1 text-xs font-bold text-[#2a2117]";

/**
 * Chapter page of Read (STU-04): the chapter title, the read-along passage with audio and
 * translation, the chapter picture, the word list, the previous and next chapter links, and
 * the question panels. A student sees a chapter only when its story is in the level window
 * (level +/- 1); a chapter outside it, an unpublished story, a bad id, or a bad chapter
 * number gives 404. Staff see every published story. The page writes nothing.
 * @param props.params The story id and the chapter number.
 * @returns The page.
 */
export default async function ChapterPage({ params }: PageProps) {
  const { storyId, chapterNumber: rawNumber } = await params;
  const n = Number(rawNumber);
  if (!Number.isInteger(n) || n < 1) notFound();

  const user = await currentUser();
  if (!user) notFound();

  const tenant = { schoolId: user.schoolId };
  const tenantDb = createTenantDB(db, tenant);
  let data;
  let total = n;
  try {
    const [chapter, story] = await Promise.all([
      getChapterForStudent({ db: tenantDb, user, tenant, input: { storyId, chapterNumber: n } }),
      getStoryForStudent({ db: tenantDb, user, tenant, input: { storyId } }),
    ]);
    data = chapter;
    total = Math.max(n, story.chapters.length);
  } catch (error) {
    if (error instanceof Error && (error.name === "StoryNotFoundError" || error.name === "ChapterNotFoundError" || error.name === "StoryError" || error.name === "ZodError")) notFound();
    throw error;
  }

  const t = await getTranslations("Stories");
  const { story, chapter, words, previousChapterNumber, nextChapterNumber } = data;
  const translated = (chapter.translatedPassage ?? {}) as Record<string, string[]>;
  const wordList: WordListTimestamp[] = words.words.map((w) => ({
    vocabulary: w.vocabulary,
    definition: {
      en: w.definition.en ?? "",
      th: w.definition.th ?? "",
      cn: w.definition.cn ?? "",
      tw: w.definition.tw ?? "",
      vi: w.definition.vi ?? "",
    },
    timeSeconds: w.timeSeconds,
  }));
  const wordsAudio = words.wordsUrl || chapter.audioKey || "";

  return (
    <Scene place="library">
      <Link href={`/student/read/stories/${story.id}`} className={cn(rpgButton("iron"), "w-fit min-h-12")}>
        <ChevronLeftIcon className="size-5" aria-hidden /> {t("chapterToStory")}
      </Link>
      <Panel className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={BADGE}>{t("chapterOf", { n: chapter.chapterNumber, total })}</span>
        </div>
        <h1 className="text-2xl font-bold md:text-3xl">{chapter.title}</h1>
        <ChapterContent
          title={chapter.title}
          passage={chapter.passage}
          sentences={chapter.sentences}
          translatedPassage={translated}
          audioKey={chapter.audioKey}
          imageUrl={getChapterImageUrl({ id: chapter.id, image: chapter.imageKey })}
          imageAlt={t("chapterPicture")}
        />
      </Panel>
      <Panel className="flex-row flex-wrap items-center gap-2">
        <WordList articleId={chapter.id} words={wordList} audioUrl={wordsAudio} />
      </Panel>
      <Panel>
        <ChapterQuestions chapterId={chapter.id} userLevel={user.level} />
      </Panel>
      <nav aria-label={t("chapterNav")} className="flex flex-wrap gap-2">
        {previousChapterNumber !== null ? (
          <Link href={`/student/read/stories/${story.id}/${previousChapterNumber}`} className={cn(rpgButton("iron"), "min-h-12")}>
            <ChevronLeftIcon className="size-5" aria-hidden /> {t("chapterNumber", { n: previousChapterNumber })}
          </Link>
        ) : null}
        {nextChapterNumber !== null ? (
          <Link href={`/student/read/stories/${story.id}/${nextChapterNumber}`} className={cn(rpgButton("gold"), "min-h-12")}>
            {t("chapterNext")} <ChevronRightIcon className="size-5" aria-hidden />
          </Link>
        ) : null}
      </nav>
      <GoToTop />
    </Scene>
  );
}
