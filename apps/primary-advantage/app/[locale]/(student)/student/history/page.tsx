import React from "react";
import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import { ArticleRecordsTable } from "@/components/dashboard/article-records-table";
import { ReminderRereadTable } from "@/components/dashboard/reminder-reread-table";

export default async function HistoryPage() {
  const t = await getTranslations("Student.history");
  return (
    <>
      <Header
        heading={t("reminderToReread.title")}
        text={t("reminderToReread.description")}
        variant="warning"
      />
      <ReminderRereadTable />
      <Header
        heading={t("articleRecords.title")}
        text={t("articleRecords.description")}
      />
      <ArticleRecordsTable />
    </>
  );
}
