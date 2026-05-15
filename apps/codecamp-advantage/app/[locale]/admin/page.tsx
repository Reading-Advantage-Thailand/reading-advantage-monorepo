"use client";

import { Link } from "@/i18n/navigation";
import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { Progress } from "@reading-advantage/ui";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { formatDate } from "@/lib/i18n-format";
import {
  UserPlus,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AdminPage() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { user, isLoading: authLoading } = useAuth();
  const { data: interns, isLoading: dataLoading } = trpc.codecamp.listInterns.useQuery(
    undefined,
    { enabled: user?.role === "ADMIN" }
  );

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">{t("accessDenied")}</h1>
          <p className="text-muted-foreground">
            {t("noPrivileges")}
          </p>
          <Button asChild>
            <Link href="/">{t("backToDashboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = dataLoading;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">{t("dashboardTitle")}</h1>
          </div>
          <p className="text-muted-foreground">
            {t("dashboardSubtitle")}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/new-intern">
            <UserPlus className="mr-2 h-4 w-4" />
            {t("newIntern")}
          </Link>
        </Button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("totalInterns")}</p>
          <p className="mt-2 text-3xl font-bold">
            {isLoading ? "—" : interns?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("avgProgress")}</p>
          <p className="mt-2 text-3xl font-bold">
            {isLoading
              ? "—"
              : interns && interns.length > 0
                ? `${Math.round(
                    interns.reduce((s: number, i: { overallProgress: number }) => s + i.overallProgress, 0) / interns.length
                  )}%`
                : "0%"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("pendingReviews")}</p>
          <p className="mt-2 text-3xl font-bold">
            {isLoading
              ? "—"
              : interns?.reduce((s, i) => s + i.prReviewsPending, 0) ?? 0}
          </p>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="p-4">
          <h2 className="text-lg font-semibold">{t("cohortOverview")}</h2>
        </div>
        {isLoading ? (
          <div className="p-8">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </div>
        ) : !interns || interns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">{t("empty.noInterns")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("empty.createToStart")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Intern accounts">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t("name")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("username")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("progress")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("modules")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("quizAvg")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("prReviews")}</th>
                  <th className="px-4 py-3 text-left font-medium">{t("lastActive")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern: {
                  userId: string;
                  name: string | null;
                  username: string;
                  overallProgress: number;
                  completedModules: number;
                  totalModules: number;
                  quizAverage: number;
                  prReviewsPending: number;
                  prReviewsApproved: number;
                  lastActiveAt: Date | null;
                }) => (
                  <tr key={intern.userId} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{intern.name ?? intern.username}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      @{intern.username}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={intern.overallProgress}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-muted-foreground">
                          {intern.overallProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span>
                          {intern.completedModules}/{intern.totalModules}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{intern.quizAverage}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {intern.prReviewsPending > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {intern.prReviewsPending}
                          </span>
                        )}
                        {intern.prReviewsApproved > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {intern.prReviewsApproved}
                          </span>
                        )}
                        {intern.prReviewsPending === 0 && intern.prReviewsApproved === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {intern.lastActiveAt
                          ? formatDate(intern.lastActiveAt, locale)
                          : t("never")}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/${intern.userId}`}>
                          {t("details")}
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
