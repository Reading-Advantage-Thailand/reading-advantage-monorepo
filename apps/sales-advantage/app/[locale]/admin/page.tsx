"use client";

import { trpc } from "@/lib/trpc";
import { useLocale, useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { Users, BookOpen, UserPlus } from "lucide-react";

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale);
  const { data, isLoading, error } = trpc.sales.admin.cohortOverview.useQuery();

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <div className="flex gap-2">
          <Link href="/admin/create-rep">
            <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <UserPlus className="h-4 w-4" /> {t("createRep")}
            </button>
          </Link>
          <Link href="/admin/curriculum">
            <button className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              <BookOpen className="h-4 w-4" /> {t("curriculum")}
            </button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> {t("cohort")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {t("reportingUnavailable")}
            </p>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noReps")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">{t("cohortCaption")}</caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2">
                      {t("rep")}
                    </th>
                    <th scope="col" className="py-2">
                      {t("modulesCompleted")}
                    </th>
                    <th scope="col" className="py-2">
                      {t("avgRoleplayScore")}
                    </th>
                    <th scope="col" className="py-2">
                      {t("attempts")}
                    </th>
                    <th scope="col" className="py-2">
                      {t("avgQuizScore")}
                    </th>
                    <th scope="col" className="py-2">
                      {t("lastActive")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.userId} className="border-b">
                      <th scope="row" className="py-2 text-left font-medium">
                        <Link
                          href={`/admin/${row.userId}`}
                          className="text-primary hover:underline"
                        >
                          {row.displayName}
                        </Link>
                        <span className="block text-xs font-normal text-muted-foreground">
                          @{row.username}
                        </span>
                      </th>
                      <td className="py-2">
                        {row.modulesCompleted}/{row.totalModules}
                      </td>
                      <td className="py-2">
                        {row.avgRoleplayScore != null
                          ? row.avgRoleplayScore
                          : t("notAvailable")}
                      </td>
                      <td className="py-2">{row.roleplayAttemptCount}</td>
                      <td className="py-2">
                        {row.avgQuizScore != null
                          ? `${row.avgQuizScore}%`
                          : t("notAvailable")}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {row.lastActive
                          ? dateFormatter.format(new Date(row.lastActive))
                          : t("notAvailable")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
