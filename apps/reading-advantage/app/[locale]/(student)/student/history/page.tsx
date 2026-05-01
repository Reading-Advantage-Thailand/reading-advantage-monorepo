import { ArticleRecordsTable } from "@/components/article-records-table";
import { Header } from "@/components/header";
import { ReminderRereadTable } from "@/components/reminder-reread-table";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React from "react";
import { getScopedI18n } from "@/locales/server";
import { fetchData } from "@/utils/fetch-data";
import { RecordStatus } from "@/types/constants";

type Props = {};

export const metadata = {
  title: "History",
};

async function getUserArticleRecords(userId: string) {
  return await fetchData(`/api/v1/users/records/${userId}`);
}

export default async function HistoryPage({}: Props) {
  // const t = useTranslations('pages.student.article-records')
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }
  if (user.cefr_level === "" && user.level === 0) {
    return redirect("/level");
  }
  const res = await getUserArticleRecords(user.id);

  // Transform the data to match ArticleRecord type
  const transformedRecords = res.results.map((record: any) => ({
    ...record,
    title: record.details?.articleTitle || "Unknown Article",
    rating: record.details?.rated || 0,
    status: record.completed ? RecordStatus.COMPLETED : RecordStatus.UNRATED,
  }));

  // Separate articles based on completion status
  // Incomplete articles (for reminder to reread)
  const incompleteArticles = transformedRecords.filter(
    (article: any) => article.status !== RecordStatus.COMPLETED
  );

  // Completed articles (for article records)
  const completedArticles = transformedRecords.filter(
    (article: any) => article.status === RecordStatus.COMPLETED
  );

  const t = await getScopedI18n("pages.student.historyPage");
  return (
    <>
      <Header
        heading={t("reminderToReread")}
        text={t("reminderToRereadDescription")}
        variant="warning"
      />
      {incompleteArticles.length !== 0 && (
        <ReminderRereadTable articles={incompleteArticles} />
      )}
      <Header
        heading={t("articleRecords")}
        text={t("articleRecordsDescription")}
      />
      <ArticleRecordsTable articles={completedArticles} />
    </>
  );
}
