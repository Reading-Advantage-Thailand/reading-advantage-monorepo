import StoryChapterCard from "@/components/stories-chapter-card";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import { getScopedI18n } from "@/locales/server";
import { fetchData } from "@/utils/fetch-data";
import CustomError from "./custom-error";
import StoriesWordList from "@/components/stories-word-list";
import StoryMCQuestionCard from "@/components/stories-chapter-question/mc-question-card";
import StorySAQuestionCard from "@/components/stories-chapter-question/sa-question-card";
import StoryLAQuestionCard from "@/components/stories-chapter-question/laq-question-card";

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
          <StoriesWordList
            chapter={chapterResponse}
            storyId={storyId}
            chapterNumber={chapterNumber}
            userId={user.id}
          />

          <StoryMCQuestionCard
            userId={user.id}
            storyId={chapterResponse.storyId}
            articleTitle={chapterResponse.chapter.title}
            articleLevel={chapterResponse.ra_Level}
            chapterNumber={chapterResponse.chapterNumber}
          />

          <StorySAQuestionCard
            userId={user.id}
            storyId={storyId}
            articleTitle={chapterResponse.chapter.title}
            articleLevel={chapterResponse.ra_Level}
            chapterNumber={chapterResponse.chapterNumber}
          />

          <StoryLAQuestionCard
            userId={user.id}
            storyId={storyId}
            userLevel={user.level}
            articleTitle={chapterResponse.chapter.title}
            articleLevel={chapterResponse.ra_Level}
            chapterNumber={chapterResponse.chapterNumber}
          />
        </div>
      </div>
    </div>
  );
}
