import StoryChapterCard from "@/components/stories-chapter-card";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import { getScopedI18n } from "@/locales/server";
import { fetchData } from "@/utils/fetch-data";
import CustomError from "./custom-error";
import WordList from "@/components/word-list";
import MCQuestionCard from "@/components/questions/mc-question-card";
import SAQuestionCard from "@/components/questions/sa-question-card";
import LAQuestionCard from "@/components/questions/laq-question-card";

export const metadata = {
  title: "Story",
  description: "Story",
};

async function getStoryChapter(storyId: string, chapterNumber: string) {
  return fetchData(`/api/v1/stories/${storyId}/${chapterNumber}`);
}

export default async function ArticleQuizPage({
  params,
}: {
  params: Promise<{ storyId: string; chapterNumber: string }>;
}) {
  const { storyId, chapterNumber } = await params;
  const t = await getScopedI18n("pages.student.storyPage.story");

  const user = await getCurrentUser();
  if (!user) return redirect("/auth/signin");

  const chapterResponse = await getStoryChapter(storyId, chapterNumber);

  if (chapterResponse.message)
    return (
      <CustomError message={chapterResponse.message} resp={chapterResponse} />
    );

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Chapter Card */}
        <div className="lg:col-span-2">
          <StoryChapterCard
            story={chapterResponse}
            storyId={storyId}
            userId={user.id}
            chapterNumber={chapterNumber}
          />
        </div>

        {/* Sidebar - Word List and Questions */}
        <div className="lg:col-span-1 space-y-6">
          <WordList
            dataSource={{
              type: "stories",
              chapter: chapterResponse,
              storyId,
              chapterNumber,
            }}
            userId={user.id}
            wrapperClassName=""
            triggerClassName="mb-4 ml-3"
          />

          <MCQuestionCard
            userId={user.id}
            articleId={chapterResponse.storyId}
            articleTitle={chapterResponse.chapter.title}
            articleLevel={chapterResponse.ra_Level}
            page="article"
            variant="story"
            chapterNumber={chapterResponse.chapterNumber}
          />

          <SAQuestionCard
            userId={user.id}
            articleId={storyId}
            articleTitle={chapterResponse.chapter.title}
            articleLevel={chapterResponse.ra_Level}
            page="article"
            variant="story"
            chapterNumber={chapterResponse.chapterNumber}
          />

          <LAQuestionCard
            userId={user.id}
            articleId={storyId}
            userLevel={user.level ?? 0}
            articleTitle={chapterResponse.chapter.title}
            articleLevel={chapterResponse.ra_Level}
            variant="story"
            chapterNumber={chapterResponse.chapterNumber}
          />
        </div>
      </div>
    </div>
  );
}
