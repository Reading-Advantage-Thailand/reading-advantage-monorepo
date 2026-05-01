import React from "react";
import { ArticleRecordsTable } from "@/components/article-records-table";
import { Header } from "@/components/header";
import { ReminderRereadTable } from "@/components/reminder-reread-table";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { getScopedI18n } from "@/locales/server";
import { fetchData } from "@/utils/fetch-data";
import { headers } from "next/headers";
import { ArticleRecord } from "@/types";
import { RecordStatus } from "@/types/constants";

interface ActivityRecord {
  id: string;
  userId: string;
  targetId: string;
  activityType: string;
  completed: boolean;
  details: {
    level?: number;
    articleTitle?: string;
    rating?: number;
    rated?: number;
    score?: number;
    scores?: number;
    timer?: number;
    articleId?: string;
    ratingCompleted?: boolean;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

interface ExtendedArticleRecord extends ArticleRecord {
  updated_at: string;
}

async function getUserArticleRecords(userId: string) {
  try {
    return await fetchData(`/api/v1/users/records/${userId}`);
  } catch (error) {
    console.error("Error fetching user article records:", error);
    return { results: [], error: "Failed to fetch article records" };
  }
}

export default async function StudentHistoryForTeacher({
  params,
}: {
  params: Promise<{ studentId: string; classroomId: string }>;
}) {
  const { studentId, classroomId } = await params;
  const user = await getCurrentUser();
  const t = await getScopedI18n("pages.student.historyPage");
  if (!user) {
    return redirect("/auth/signin");
  }
  const res = await getUserArticleRecords(studentId);

  if (res.error) {
    return (
      <div>
        <div className="mb-4">
          <Header heading={`History Activity`} />
          <div className="p-4 text-center text-red-500">
            <p>Error loading student history: {res.error}</p>
          </div>
        </div>
      </div>
    );
  }

  const transformedResults: ExtendedArticleRecord[] = res.results.map(
    (activity: ActivityRecord) => {
      const details = activity.details || {};

      const rating = details.rating !== undefined ? details.rating : 0;
      const score = details.score !== undefined ? details.score : 0;

      return {
        id: activity.id,
        articleId: activity.targetId,
        userId: activity.userId,
        title: details.articleTitle || "Unknown Article",
        rating: rating,
        score: score,
        timeRecorded: details.timer || 0,
        status: activity.completed
          ? RecordStatus.COMPLETED
          : RecordStatus.UNRATED,
        createdAt: {
          _seconds: Math.floor(new Date(activity.created_at).getTime() / 1000),
          _nanoseconds: 0,
        },
        updatedAt: {
          _seconds: Math.floor(new Date(activity.updated_at).getTime() / 1000),
          _nanoseconds: 0,
        },
        updated_at: activity.updated_at,
        questions: [],
        userLevel: details.level || 0,
        updatedLevel: details.level || 0,
        calculatedLevel: details.level || 0,
      } as ExtendedArticleRecord;
    }
  );

  const reminderArticles = transformedResults.filter(
    (article: ExtendedArticleRecord) => article.rating < 3
  );

  const articleRecords = transformedResults.filter(
    (article: ExtendedArticleRecord) => article.rating >= 3
  );

  const StudentsData = async () => {
    try {
      const requestHeaders = await headers();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${studentId}`,
        { method: "GET", headers: requestHeaders }
      );
      if (!res.ok) throw new Error("Failed to fetch student data");
      const fetchdata = await res.json();
      return fetchdata.data;
    } catch (error) {
      console.error("Error fetching student data:", error);
      return { display_name: "Unknown Student" };
    }
  };

  const studentData = await StudentsData();

  return (
    <div>
      <div className="mb-4">
        <Header heading={`History Activity of ${studentData.display_name}`} />
        <Header
          heading={t("reminderToReread")}
          text={t("reminderToRereadDescription")}
          variant="warning"
        />
        {reminderArticles.length !== 0 && (
          <ReminderRereadTable articles={reminderArticles as ArticleRecord[]} />
        )}
        <Header
          heading={t("articleRecords")}
          text={t("articleRecordsDescription")}
        />
        <ArticleRecordsTable articles={articleRecords as ArticleRecord[]} />
      </div>
    </div>
  );
}
