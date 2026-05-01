"use client";
import React from "react";
import { useSearchParams } from "next/navigation";
import ArticleShowcaseCard from "./article-showcase-card";
import { useTranslations } from "next-intl";

interface Article {
  id: string;
  title: string;
  type: string;
  genre: string | null;
  subGenre?: string | null;
}

export default function ArticleSelect({
  initialArticles,
  total,
}: {
  initialArticles: Article[];
  total: number;
}) {
  const searchParams = useSearchParams();
  const t = useTranslations("Article");

  const [loading, setLoading] = React.useState(false);
  const [articles, setArticles] = React.useState(initialArticles);
  const [page, setPage] = React.useState(1);
  const observerRef = React.useRef<HTMLDivElement>(null);

  const selectedType = searchParams.get("type");
  const selectedGenre = searchParams.get("genre");
  const selectedSubgenre = searchParams.get("subgenre");

  const loadMore = async () => {
    if (loading || articles.length >= total) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        limit: "10",
        offset: String(page * 10),
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
        setPage((p) => p + 1);
      }
    } catch (error) {
      console.error("Error loading more articles:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && articles.length < total) {
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
  }, [loading, articles.length, total]);

  React.useEffect(() => {
    setPage(1);
    setArticles(initialArticles);
  }, [selectedType, selectedGenre, selectedSubgenre, initialArticles]);

  if (articles.length === 0 && loading) {
    return (
      <div className="mt-4 grid grid-flow-row gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-80 w-full animate-pulse rounded-md bg-gray-200"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.length ? (
        <div className="mt-4 grid grid-flow-row gap-4 sm:grid-cols-2">
          {articles.map((article, index) => (
            <ArticleShowcaseCard key={index} article={article} />
          ))}
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-center text-2xl text-gray-500">
          No articles found.
        </div>
      )}

      {articles.length < total && (
        <div ref={observerRef} className="py-4 text-center text-gray-500">
          {loading ? "Loading more..." : "Scroll down to load more"}
        </div>
      )}
    </div>
  );
}
