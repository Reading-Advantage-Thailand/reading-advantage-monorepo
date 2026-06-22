"use client";

import { trpc } from "@/lib/trpc";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@reading-advantage/ui";
import { Badge } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { Users, BookOpen, UserPlus } from "lucide-react";

export default function AdminPage() {
  const t = useTranslations("admin");
  const { data, isLoading } = trpc.sales.admin.cohortOverview.useQuery();

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
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reps yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Rep</th>
                  <th className="py-2">{t("modulesCompleted")}</th>
                  <th className="py-2">{t("avgRoleplayScore")}</th>
                  <th className="py-2">{t("avgQuizScore")}</th>
                  <th className="py-2">{t("lastActive")}</th>
                </tr>
              </thead>
              <tbody>
                {(data as unknown as Array<{
                  userId: string;
                  username?: string;
                  modulesCompleted?: number;
                  avgRoleplayScore?: number;
                  avgQuizScore?: number;
                  lastActive?: string | Date;
                }>).map((row) => (
                  <tr key={row.userId} className="border-b">
                    <td className="py-2">
                      <Link href={`/admin/${row.userId}`} className="text-primary hover:underline">
                        {row.username ?? row.userId}
                      </Link>
                    </td>
                    <td className="py-2">{row.modulesCompleted ?? 0}</td>
                    <td className="py-2">
                      {row.avgRoleplayScore != null ? `${Math.round(row.avgRoleplayScore)}` : "—"}
                    </td>
                    <td className="py-2">
                      {row.avgQuizScore != null ? `${Math.round(row.avgQuizScore)}%` : "—"}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {row.lastActive ? new Date(row.lastActive).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}