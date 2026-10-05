import ArticleSelect from "@/components/articles/article-select";
import genreDataJson from "@/data/genres.json";
import { Link } from "@/i18n/navigation";
import { fetchArticles } from "@/server/controllers/articleController";
import { cleanGenre, cn, sanitizeTranslationKey } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GoToTop } from "@/components/go-to-top";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/session";
import { StatusChip } from "@reading-advantage/ui";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    genre?: string;
    subgenre?: string;
  }>;
}

/** One genre of a story type and its topics. */
export interface GenreItem {
  name: string;
  subgenres: string[];
}

/** Genres per story type (data/genres.json). */
export type GenreData = {
  [type: string]: GenreItem[];
};

const genreData = genreDataJson as GenreData;

/** A filter choice: selected chips are filled; open choices are outlined. 48 px tall. */
const CHOICE = "min-h-12 rounded-full px-5 text-base";

/**
 * Read list (audit S1): the student's level, the story filter steps (type, then genre, then
 * topic; the chosen steps show as filled chips), and the story grid. Loading is
 * `loading.tsx`, a failed load is `error.tsx`, and an empty filter shows the grid empty state.
 * @param props.searchParams The type, genre, and subgenre filters.
 * @returns The page.
 */
export default async function ReadPage({ searchParams }: PageProps) {
  const { type, genre, subgenre } = await searchParams;
  const user = await currentUser();
  const t = await getTranslations();

  const initialData = await fetchArticles(
    new URLSearchParams({
      ...(type ? { type } : {}),
      ...(genre ? { genre } : {}),
      ...(subgenre ? { subgenre } : {}),
      limit: "10",
      offset: "0",
    }),
  );

  const genres = type ? (genreData[type] ?? []) : [];
  const subgenres = type && genre ? (genres.find((g) => cleanGenre(g.name) === genre)?.subgenres ?? []) : [];
  const typeHref = (typeKey: string) => `/student/read?type=${typeKey}`;
  const genreHref = (genreName: string) => `${typeHref(type!)}&genre=${encodeURIComponent(cleanGenre(genreName))}`;

  // Chosen steps (filled chips) and the choices of the next step (outlined).
  const chosen = [
    type ? { key: "type", label: t(`Article.types.${type}`), href: typeHref(type) } : null,
    type && genre ? { key: "genre", label: t(`Article.genres.${sanitizeTranslationKey(genre)}`), href: genreHref(genre) } : null,
    type && genre && subgenre
      ? { key: "subgenre", label: t(`Article.subgenres.${sanitizeTranslationKey(subgenre)}`), href: `${genreHref(genre)}&subgenre=${encodeURIComponent(subgenre)}` }
      : null,
  ].filter((step): step is { key: string; label: string; href: string } => step !== null);
  const next = !type
    ? {
        heading: t("ReadList.chooseType"),
        choices: Object.keys(genreData).map((typeKey) => ({ label: t(`Article.types.${typeKey}`), href: typeHref(typeKey) })),
      }
    : !genre
      ? {
          heading: t("ReadList.chooseGenre"),
          choices: genres.map((g) => ({ label: t(`Article.genres.${sanitizeTranslationKey(g.name)}`), href: genreHref(g.name) })),
        }
      : !subgenre
        ? {
            heading: t("ReadList.chooseSubgenre"),
            choices: subgenres.map((sub) => ({
              label: t(`Article.subgenres.${sanitizeTranslationKey(sub)}`),
              href: `${genreHref(genre)}&subgenre=${encodeURIComponent(cleanGenre(sub))}`,
            })),
          }
        : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold md:text-3xl">{t("ReadList.title")}</h1>
        <p className="text-muted-foreground">{t("ReadList.subtitle")}</p>
        {user?.cefrLevel ? (
          <StatusChip tone="success" className="text-sm">
            {t("ReadList.yourLevel", { level: user.cefrLevel })}
          </StatusChip>
        ) : null}
      </header>

      <nav aria-label={t("ReadList.filters")} className="bg-card flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
        {chosen.length ? (
          <ul className="flex flex-wrap items-center gap-2">
            {chosen.map((step) => (
              <li key={step.key}>
                <Link
                  href={step.href}
                  aria-current="true"
                  className={cn(buttonVariants({ variant: "default" }), CHOICE)}
                  scroll={false}
                >
                  {step.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/student/read" className={cn(buttonVariants({ variant: "ghost" }), CHOICE, "underline")}>
                {t("Components.resetFilter")}
              </Link>
            </li>
          </ul>
        ) : null}
        {next ? (
          <>
            <h2 className="text-sm font-semibold">{next.heading}</h2>
            <ul className="flex flex-wrap gap-2">
              {next.choices.map((choice) => (
                <li key={choice.href}>
                  <Link href={choice.href} className={cn(buttonVariants({ variant: "outline" }), CHOICE)} scroll={false}>
                    {choice.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </nav>

      <ArticleSelect initialArticles={initialData.articles} total={initialData.totalArticles} />
      <GoToTop />
    </div>
  );
}
