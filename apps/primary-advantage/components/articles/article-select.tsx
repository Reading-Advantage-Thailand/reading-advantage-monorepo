"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpenIcon } from "lucide-react";
import { EmptyState, ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import ArticleShowcaseCard from "./article-showcase-card";

interface Article {
  id: string;
  title: string;
  type: string | null;
  genre: string | null;
  subGenre?: string | null;
}

/**
 * The story grid of the read list with infinite scroll. It shows shimmer cards while more
 * stories load, an empty state with a way back to all stories, and an error with a retry when
 * loading more fails.
 * @param props.initialArticles The first page from the server.
 * @param props.total The number of stories that match the filter.
 * @returns The grid and its states.
 */
export default function ArticleSelect({
  initialArticles,
  total,
}: {
  initialArticles: Article[];
  total: number;
}) {
  const searchParams = useSearchParams();
  const t = useTranslations("ReadList");
  const tc = useTranslations("Components");
  const te = useTranslations("Error");

  const [loading, setLoading] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [articles, setArticles] = React.useState(initialArticles);
  const observerRef = React.useRef<HTMLDivElement>(null);
  const offsetRef = React.useRef(initialArticles.length);
  const inFlightRef = React.useRef(false);

  const selectedType = searchParams.get("type");
  const selectedGenre = searchParams.get("genre");
  const selectedSubgenre = searchParams.get("subgenre");

  const loadMore = async () => {
    if (inFlightRef.current || articles.length >= total) return;
    inFlightRef.current = true;
    setLoading(true);
    setFailed(false);

    try {
      const params = new URLSearchParams({
        limit: "10",
        offset: String(offsetRef.current),
        ...(selectedType ? { type: selectedType } : {}),
        ...(selectedGenre ? { genre: selectedGenre } : {}),
        ...(selectedSubgenre ? { subgenre: selectedSubgenre } : {}),
      });

      const res = await fetch(`/api/articles?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch articles");

      const data = await res.json();

      const newArticles = data.articles.filter(
        (newArticle: Article) =>
          !articles.some((existing) => existing.id === newArticle.id),
      );

      if (newArticles.length > 0) {
        setArticles((prev) => [...prev, ...newArticles]);
      }
      offsetRef.current += data.articles.length;
    } catch (error) {
      console.error("Error loading more articles:", error);
      setFailed(true);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // After a failure the student retries with the button, not by scrolling.
        if (entry.isIntersecting && !loading && !failed && articles.length < total) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    observer.observe(observerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading, failed, articles.length, total]);

  React.useEffect(() => {
    offsetRef.current = initialArticles.length;
    inFlightRef.current = false;
    setFailed(false);
    setArticles(initialArticles);
  }, [selectedType, selectedGenre, selectedSubgenre, initialArticles]);

  if (!articles.length && !loading) {
    return (
      <EmptyState
        className="bg-card border"
        icon={<BookOpenIcon />}
        title={t("empty")}
        description={t("emptyHint")}
        action={
          selectedType ? (
            <Link href="/student/read" className={cn(buttonVariants({ variant: "default" }), "min-h-12 rounded-xl px-6")}>
              {tc("resetFilter")}
            </Link>
          ) : null
        }
      />
    );
  }

  return (
    <section aria-label={t("stories")} className="flex flex-col gap-4">
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <li key={article.id}>
            <ArticleShowcaseCard article={article} />
          </li>
        ))}
        {loading &&
          [0, 1].map((slot) => (
            <li key={`loading-${slot}`} aria-hidden="true">
              <ShimmerSkeleton className="h-80 rounded-2xl" />
            </li>
          ))}
      </ul>

      {failed ? (
        <ErrorState
          className="bg-card border"
          title={t("loadMoreError")}
          action={
            <Button type="button" className="min-h-12 px-6" onClick={() => loadMore()}>
              {te("retry")}
            </Button>
          }
        />
      ) : null}

      {articles.length < total && (
        <div ref={observerRef} aria-live="polite" className="text-muted-foreground py-4 text-center text-sm">
          {loading ? t("loadingMore") : failed ? null : t("scrollMore")}
        </div>
      )}
    </section>
  );
}
