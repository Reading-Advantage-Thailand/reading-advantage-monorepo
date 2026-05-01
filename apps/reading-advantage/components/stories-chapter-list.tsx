"use client";

import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle, BookOpen, ArrowRight } from "lucide-react";
import React from "react";

interface Chapter {
  title: string;
  summary: string;
  is_read: boolean;
  is_completed: boolean;
}

interface ChapterListProps {
  locale: string;
  storyId: string;
  chapters: Chapter[];
  translations: {
    chapters: string;
    characters: string;
    previouslyRead: string;
    continueRead: string;
    readChapter: string;
    completed: string;
    started: string;
  };
}

export default function ChapterList({
  locale,
  storyId,
  chapters,
  translations,
}: ChapterListProps) {
  const router = useRouter();
  const [chapterSummary, setChapterSummary] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasTranslated, setHasTranslated] = React.useState(false);

  const handleChapterClick = (chapterNumber: number) => {
    router.push(`/${locale}/student/stories/${storyId}/${chapterNumber}`);
  };

  async function getTranslate(
    storyId: string,
    targetLanguage: string
  ): Promise<{ message: string; translated_sentences: string[] }> {
    try {
      const res = await fetch(
        `/api/v1/assistant/stories-translate/${storyId}`,
        {
          method: "POST",
          body: JSON.stringify({ type: "chapter", targetLanguage }),
        }
      );
      const data = await res.json();
      return data;
    } catch (error) {
      return { message: "error", translated_sentences: [] };
    }
  }

  React.useEffect(() => {
    const fetchTranslations = async () => {
      if (!locale || locale === "en" || isLoading || hasTranslated) {
        return;
      }

      setIsLoading(true);
      try {
        type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
        let localeTarget: ExtendedLocale = locale as ExtendedLocale;
        switch (locale) {
          case "cn":
            localeTarget = "zh-CN";
            break;
          case "tw":
            localeTarget = "zh-TW";
            break;
        }

        const translatedChapters = await Promise.all(
          chapters.map(async (chapter, index) => {
            const res = await getTranslate(storyId, localeTarget);
            return res.translated_sentences[index];
          })
        );

        setChapterSummary(translatedChapters);
        setHasTranslated(true);
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranslations();
  }, [locale, storyId, chapters, isLoading, hasTranslated]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {chapters.map((chapter, index) => {
        const isStarted = chapter.is_read && !chapter.is_completed;
        const isCompleted = chapter.is_read && chapter.is_completed;
        const isUnread = !chapter.is_read;

        return (
          <Card
            key={index}
            className={`group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
              isCompleted
                ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                : isStarted
                  ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
                  : "hover:border-primary/50"
            }`}
            onClick={() => handleChapterClick(index + 1)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <CardTitle className="text-lg leading-tight flex-1">
                    {chapter.title}
                  </CardTitle>
                </div>
                {isCompleted && (
                  <Badge className="bg-green-600 hover:bg-green-700 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="text-xs">{translations.completed}</span>
                  </Badge>
                )}
                {isStarted && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shrink-0">
                    <PlayCircle className="w-3 h-3" />
                    <span className="text-xs">{translations.started}</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-3/5" />
                </div>
              ) : (
                <CardDescription className="text-sm line-clamp-3">
                  {chapterSummary[index] || chapter.summary}
                </CardDescription>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  variant={
                    isCompleted ? "outline" : isStarted ? "default" : "outline"
                  }
                  size="sm"
                  className="group-hover:translate-x-1 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChapterClick(index + 1);
                  }}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  {isStarted
                    ? translations.continueRead + " " + (index + 1)
                    : translations.readChapter + " " + (index + 1)}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
