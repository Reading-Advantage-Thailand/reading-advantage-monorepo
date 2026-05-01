"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import ArticleShowcaseCard from "./article-showcase-card";
import { articleShowcaseType } from "@/types";
import { useCurrentLocale } from "@/locales/client";
import { Skeleton } from "./ui/skeleton";

type Props = {
  user: {
    level: number;
    name: string;
    id: string;
  };
};

async function fetchArticles(params: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/articles?${params}`
  );

  const data = await response.json();
  return data;
}

export default function Select({ user }: Props) {
  const t = useScopedI18n("components.select");
  const ta = useScopedI18n("components.article");
  const locale = useCurrentLocale();
  const tf: string | any = useScopedI18n("selectType.types");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(false);
  const [articleTypesData, setArticleTypesData] = React.useState<string[]>([]);
  const [articleShowcaseData, setArticleShowcaseData] = React.useState<
    articleShowcaseType[]
  >([]);
  const [page, setPage] = React.useState(1);
  const observer = React.useRef<IntersectionObserver | null>(null);

  const selectedType = searchParams.get("type");
  const selectedGenre = searchParams.get("genre");
  const selectedSubgenre = searchParams.get("subgenre");
  function getArticleType() {
    if (!selectedType && !selectedGenre && !selectedSubgenre) return "type";
    if (selectedType && !selectedGenre && !selectedSubgenre) return "genre";
    if (selectedType && selectedGenre && !selectedSubgenre) return "subGenre";
    return "article";
  }

  async function handleButtonClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!selectedType && !selectedGenre && !selectedSubgenre) {
      params.set("type", value);
    }
    if (selectedType && !selectedGenre && !selectedSubgenre) {
      params.set("genre", value);
    }
    if (selectedType && selectedGenre && !selectedSubgenre) {
      params.set("subgenre", value);
    }
    router.push("?" + params.toString());
  }

  React.useEffect(() => {
    setPage(1);
  }, [searchParams]);

  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const params = new URLSearchParams(searchParams.toString());
      params.set("page", page.toString());
      params.set("limit", "10");

      const response = await fetchArticles(params.toString());

      if (response.results.length === 0 && page === 1) {
        router.push("?");
      }

      setArticleShowcaseData((prev) => {
        if (page === 1) {
          return response.results;
        }
        // Filter out duplicates when appending new results
        const existingIds = new Set(prev.map((article) => article.id));
        const newArticles = response.results.filter(
          (article: articleShowcaseType) => !existingIds.has(article.id)
        );
        return [...prev, ...newArticles];
      });

      setArticleTypesData(response.selectionType);
      setLoading(false);
    }

    fetchData();
  }, [searchParams, page, router]);

  const lastArticleRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading]
  );

  return (
    <Card id="onborda-articles" className="my-2">
      <CardHeader>
        <CardTitle>
          {t("articleChoose", {
            article: <b>{ta(getArticleType())}</b>,
          })}
        </CardTitle>
        <CardDescription>
          {t("articleChooseDescription", {
            level: <b>{user.level}</b>,
            article: <b>{ta(getArticleType())}</b>,
          })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && page === 1 ? (
          <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-80 w-full" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(selectedType || selectedGenre || selectedSubgenre) && (
                <Button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    if (selectedSubgenre) {
                      params.delete("subgenre");
                    } else if (selectedGenre) {
                      params.delete("genre");
                    } else if (selectedType) {
                      params.delete("type");
                    }
                    router.push("?" + params.toString());
                  }}
                  disabled={loading}
                >
                  {t("back")}
                </Button>
              )}
              {!selectedSubgenre &&
                articleTypesData.map((type, index) => {
                  return (
                    <Button
                      key={index}
                      onClick={() => handleButtonClick(type)}
                      disabled={loading}
                    >
                      {tf(type)}
                    </Button>
                  );
                })}
            </div>
            <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
              {articleShowcaseData.map((article, index) => {
                const isLastArticle = index === articleShowcaseData.length - 1;
                return (
                  <ArticleShowcaseCard
                    ref={isLastArticle ? lastArticleRef : null}
                    key={article.id}
                    article={article}
                    userId={user.id}
                  />
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
