import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import ChapterContent from "./stories-chapter-content";
import { Badge } from "./ui/badge";
import { getScopedI18n } from "@/locales/server";
import { ArticleFooter } from "./article-footer";
import RatingPopup from "./rating-popup";
import { StoryChapter } from "./models/article-model";
import { ChapterSummary } from "./stories-chapter-summary";
import ChapterRatingPopup from "./chapter-rating-popup";
import { BookMarked, Award } from "lucide-react";

type Props = {
  story: StoryChapter;
  storyId: string;
  userId: string;
  chapterNumber: string;
};

export default async function StoryChapterCard({
  story,
  storyId,
  userId,
  chapterNumber,
}: Props) {
  const t = await getScopedI18n("components.articleCard");
  return (
    <div className="w-full">
      <Card className="shadow-lg border-2">
        <CardHeader className="space-y-4">
          {/* Chapter Title and Badges */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-md">
                {chapterNumber}
              </div>
              <CardTitle className="font-bold text-2xl md:text-3xl flex-1">
                {story.chapter.title}
              </CardTitle>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="flex items-center gap-1.5 px-3 py-1">
                <BookMarked className="w-3.5 h-3.5" />
                {t("raLevel", {
                  raLevel: story.ra_Level,
                })}
              </Badge>
              <Badge className="flex items-center gap-1.5 px-3 py-1">
                <Award className="w-3.5 h-3.5" />
                {t("cefrLevel", {
                  cefrLevel: story.cefr_level,
                })}
              </Badge>
            </div>
          </div>

          {/* Chapter Summary */}
          <CardDescription className="text-base">
            <ChapterSummary
              story={story}
              storyId={storyId}
              chapterNumber={chapterNumber}
            />
          </CardDescription>

          {/* Chapter Image */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg">
            <Image
              src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${storyId}-${chapterNumber}.png`}
              alt={story.chapter.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Chapter Content */}
          <ChapterContent
            story={story}
            chapterNumber={chapterNumber}
            userId={userId}
          />
        </CardHeader>
        <ArticleFooter />
      </Card>

      <ChapterRatingPopup
        userId={userId}
        averageRating={story.chapter.rating || 0}
        storyId={story.storyId}
        story={story}
        chapterNumber={chapterNumber}
      />
    </div>
  );
}
