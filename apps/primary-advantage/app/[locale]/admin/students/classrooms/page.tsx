import { ClassroomsTable } from "@/components/admin/classrooms-table";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import React from "react";

export default function ClassroomsPage() {
  const t = useTranslations("Admin.Classrooms");
  return (
    <div>
      <Header heading={t("classrooms")} text={t("classroomsDescription")} />
      <Separator className="my-4" />
      <ClassroomsTable />
    </div>
  );
}
