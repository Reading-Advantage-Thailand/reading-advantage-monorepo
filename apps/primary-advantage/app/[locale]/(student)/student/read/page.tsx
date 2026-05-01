import ArticleSelect from "@/components/articles/article-select";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import genreDataJson from "@/data/genres.json";
import { Link } from "@/i18n/navigation";
import { fetchArticles } from "@/server/controllers/articleController";
import { cleanGenre, cn, sanitizeTranslationKey } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GoToTop } from "@/components/go-to-top";
import { translateAndStoreSentences } from "@/server/utils/genaretors/sentence-translator";
import { getTranslations } from "next-intl/server";
import { currentUser } from "@/lib/session";

interface PageProps {
  searchParams: Promise<{
    type?: string;
    genre?: string;
    subgenre?: string;
  }>;
}

export interface GenreItem {
  name: string;
  subgenres: string[];
}

export type GenreData = {
  [type: string]: GenreItem[];
};

const genreData = genreDataJson as GenreData;

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

  return (
    <>
      <Header heading={t("Article.selection.title")} />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>
            {t("Article.selection.description", {
              selection:
                type && genre && subgenre
                  ? t(`Article.subgenres.${sanitizeTranslationKey(subgenre)}`)
                  : type && genre
                    ? t("Article.subGenre")
                    : type
                      ? t("Article.genre")
                      : t("Article.type"),
            })}
          </CardTitle>
          <CardDescription>
            {t("Article.selection.description2", {
              level: user?.level ?? 0,
              selection:
                type && genre && subgenre
                  ? t(`Article.subgenres.${sanitizeTranslationKey(subgenre)}`)
                  : type && genre
                    ? t("Article.subGenre")
                    : type
                      ? t("Article.genre")
                      : t("Article.type"),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Type selection */}
          {!type && (
            <div className="space-y-2 space-x-2">
              {Object.keys(genreData).map((typeKey) => (
                <Link
                  key={typeKey}
                  href={`/student/read?type=${typeKey}`}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "capitalize",
                  )}
                  scroll={false}
                  replace={false}
                >
                  {t(`Article.types.${typeKey}`)}
                </Link>
              ))}
            </div>
          )}

          {/* Genre selection */}
          {type && !genre && (
            <div className="space-y-2 space-x-2">
              {genreData[type].map((g) => (
                <Link
                  key={g.name}
                  href={`/student/read?type=${type}&genre=${encodeURIComponent(cleanGenre(g.name))}`}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "capitalize",
                  )}
                  scroll={false}
                  replace={false}
                >
                  {t(`Article.genres.${sanitizeTranslationKey(g.name)}`)}
                </Link>
              ))}
            </div>
          )}

          {/* Subgenre selection */}
          {type && genre && !subgenre && (
            <div className="space-y-2 space-x-2">
              {genreData[type]
                .find((g) => cleanGenre(g.name) === genre)
                ?.subgenres.map((sub) => (
                  <Link
                    key={sub}
                    href={`/student/read?type=${type}&genre=${encodeURIComponent(
                      genre,
                    )}&subgenre=${encodeURIComponent(cleanGenre(sub))}`}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "capitalize",
                    )}
                    scroll={false}
                    replace={false}
                  >
                    {t(`Article.subgenres.${sanitizeTranslationKey(sub)}`)}
                  </Link>
                ))}
            </div>
          )}

          {/* Reset button */}
          {(type || genre || subgenre) && (
            <div className="mt-2">
              <Link
                href="/student/read"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {t("Components.resetFilter")}
              </Link>
            </div>
          )}

          <ArticleSelect
            initialArticles={initialData.articles}
            total={initialData.totalArticles}
          />
        </CardContent>
      </Card>
      <GoToTop />
    </>
  );
}
