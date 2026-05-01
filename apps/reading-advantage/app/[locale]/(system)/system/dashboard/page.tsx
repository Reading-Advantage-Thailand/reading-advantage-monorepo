import React from "react";
import { Header } from "@/components/header";
import SystemDashboardClient from "@/components/dashboard/system-dashboard-client";
import { getScopedI18n } from "@/locales/server";

export default async function SystemDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const t = await getScopedI18n("pages.system.dashboard");

  return (
    <>
      <div className="flex items-center justify-between mb-18">
        <Header heading={t("title")} />
      </div>

      <SystemDashboardClient />
    </>
  );
}
