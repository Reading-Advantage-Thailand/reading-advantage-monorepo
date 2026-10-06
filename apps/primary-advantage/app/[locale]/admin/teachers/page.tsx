import { TeachersTable } from "@/components/admin/teachers-table";
import { Header } from "@/components/header";
import { Separator } from "@reading-advantage/ui";
import React from "react";
import { getTranslations } from "next-intl/server";

export default async function TeachersPage() {
  const t = await getTranslations("AdminTeachers.page");
  return (
    <div>
      <Header heading={t("title")} text={t("description")} />
      <Separator className="my-4" />
      <TeachersTable />
    </div>
  );
}
