import React from "react";
import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import { HistoryTable } from "@/components/dashboard/history-table";

export default async function HistoryPage() {
  const t = await getTranslations("Student.history");
  return (
    <>
      <Header
        heading={t("reminderToReread.title")}
        text={t("reminderToReread.description")}
        variant="warning"
      />
      <HistoryTable variant="reminder" />
      <Header
        heading={t("articleRecords.title")}
        text={t("articleRecords.description")}
      />
      <HistoryTable variant="history" />
    </>
  );
}
