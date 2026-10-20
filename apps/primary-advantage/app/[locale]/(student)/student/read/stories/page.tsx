import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { listPrimaryStories } from "@reading-advantage/domain/stories";
import { Link } from "@/i18n/navigation";
import { currentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { GoToTop } from "@/components/go-to-top";
import { Panel, Sign, rpgButton } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { ReadTabs } from "@/components/stories/read-tabs";
import { StoryFilters, storiesHref } from "@/components/stories/story-filters";
import { StoryShelf } from "@/components/stories/story-shelf";

interface PageProps {
  searchParams: Promise<{ genre?: string; q?: string; page?: string }>;
}

const STAFF = new Set(["TEACHER", "ADMIN", "SYSTEM"]);

/**
 * Stories tab of Read (STU-04): books on shelves in the library place, a genre sign row, a
 * search box, and a page turn (10 books for each page). A student sees the stories of the
 * level window (level +/- 1); staff see every published story.
 * @param props.searchParams The genre, the search text (`q`), and the page.
 * @returns The page.
 */
export default async function StoriesPage({ searchParams }: PageProps) {
  const { genre, q: rawQ, page: pageParam } = await searchParams;
  // A search of spaces would fail the contract (min 1 after trim).
  const q = rawQ?.trim();
  const user = await currentUser();
  if (!user) notFound();
  const t = await getTranslations("Stories");

  const page = Math.max(Number.parseInt(pageParam ?? "1", 10) || 1, 1);
  const tenant = { schoolId: user.schoolId };
  const result = await listPrimaryStories({
    db: createTenantDB(db, tenant),
    user,
    tenant,
    input: { ...(genre ? { genre } : {}), ...(q ? { search: q } : {}), page },
  });

  const pages = Math.max(Math.ceil(result.total / result.pageSize), 1);
  const windowText = STAFF.has(user.role)
    ? null
    : t("yourLevel", { cefr: user.cefrLevel, from: Math.max(user.level - 1, 1), to: user.level + 1 });

  return (
    <Scene place="library">
      <header className="cq-on-scene flex flex-col gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p>{t("subtitle")}</p>
      </header>
      <ReadTabs active="stories" />
      <Panel className="gap-3">
        {windowText ? (
          <span className="inline-flex w-fit items-center rounded-full border-2 border-[#2f7d4b] bg-[#d9f0df] px-3 py-1 text-xs font-bold text-[#1d4d2d]">
            {windowText}
          </span>
        ) : null}
        <StoryFilters genres={result.genres} genre={genre} q={q} />
      </Panel>
      {result.stories.length ? (
        <div className="flex flex-col gap-6">
          <StoryShelf stories={result.stories} />
          <nav aria-label={t("pages")} className="flex items-center justify-between gap-2">
            {result.page > 1 ? (
              <Link href={storiesHref({ genre, q, page: result.page - 1 })} className={cn(rpgButton("wood"), "min-h-12 min-w-12")}>
                <ChevronLeftIcon className="size-5" aria-hidden /> {t("back")}
              </Link>
            ) : (
              <span aria-disabled="true" className={cn(rpgButton("wood"), "min-h-12 min-w-12 opacity-50")}>
                <ChevronLeftIcon className="size-5" aria-hidden /> {t("back")}
              </span>
            )}
            <Sign small className="min-h-12">
              {t("pageOf", { page: result.page, pages })}
            </Sign>
            {result.page < pages ? (
              <Link href={storiesHref({ genre, q, page: result.page + 1 })} className={cn(rpgButton("gold"), "min-h-12")}>
                {t("next")} <ChevronRightIcon className="size-5" aria-hidden />
              </Link>
            ) : (
              <span aria-disabled="true" className={cn(rpgButton("gold"), "min-h-12 opacity-50")}>
                {t("next")} <ChevronRightIcon className="size-5" aria-hidden />
              </span>
            )}
          </nav>
        </div>
      ) : (
        <Panel pinned>
          <b>{t("empty")}</b>
          <p>{t("emptyHint")}</p>
          <Link href="/student/read/stories" className={cn(rpgButton("iron"), "w-fit min-h-12")}>
            {t("clearFilters")}
          </Link>
        </Panel>
      )}
      <GoToTop />
    </Scene>
  );
}
