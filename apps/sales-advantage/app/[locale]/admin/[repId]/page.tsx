"use client";

import { use } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { trpc } from "@/lib/trpc";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@reading-advantage/ui";

/** Renders complete administrator reporting for one tenant-owned Sales rep. */
export function RepDetailContent({ repId }: { repId: string }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale);
  const { data, isLoading, error } = trpc.sales.admin.repDetail.useQuery({
    repId,
  });

  return (
    <div className="mx-auto max-w-5xl p-8">
      <Link
        href="/admin"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("backToAdmin")}
      </Link>
      <h1 className="mb-6 text-3xl font-bold">
        {data
          ? t("repDetailName", { name: data.rep.displayName })
          : t("repDetail")}
      </h1>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t("repReportingUnavailable")}
        </p>
      ) : isLoading ? (
        <div aria-busy="true" className="h-40 animate-pulse rounded bg-muted" />
      ) : data ? (
        <div className="space-y-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">{t("modules")}</dt>
              <dd className="text-2xl font-semibold">
                {data.summary.modulesCompleted}/{data.summary.totalModules}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">
                {t("roleplayAverage")}
              </dt>
              <dd className="text-2xl font-semibold">
                {data.summary.avgRoleplayScore ?? t("notAvailable")}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">
                {t("quizAverage")}
              </dt>
              <dd className="text-2xl font-semibold">
                {data.summary.avgQuizScore != null
                  ? `${data.summary.avgQuizScore}%`
                  : t("notAvailable")}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">
                {t("lastActive")}
              </dt>
              <dd className="text-lg font-semibold">
                {data.summary.lastActive
                  ? dateFormatter.format(new Date(data.summary.lastActive))
                  : t("noActivity")}
              </dd>
            </div>
          </dl>

          <Card>
            <CardHeader>
              <CardTitle>{t("moduleProgress")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {t("moduleProgressCaption")}
                </caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2">
                      {t("module")}
                    </th>
                    <th scope="col">{t("lessons")}</th>
                    <th scope="col">{t("quizAverage")}</th>
                    <th scope="col">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.modules.map((module) => (
                    <tr key={module.moduleId} className="border-b">
                      <th scope="row" className="py-2 text-left font-medium">
                        {module.title}
                      </th>
                      <td>
                        {module.lessonsCompleted}/{module.totalLessons}
                      </td>
                      <td>
                        {module.avgQuizScore != null
                          ? `${module.avgQuizScore}%`
                          : t("notAvailable")}
                      </td>
                      <td>
                        {module.completed ? t("completed") : t("inProgress")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("roleplayAttempts")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {data.scenarios.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("noRoleplayScenarios")}
                </p>
              ) : (
                data.scenarios.map((scenario) => (
                  <section
                    key={scenario.scenarioId}
                    aria-labelledby={`scenario-${scenario.scenarioId}`}
                  >
                    <h2
                      id={`scenario-${scenario.scenarioId}`}
                      className="font-semibold"
                    >
                      {scenario.lessonTitle}: {scenario.personaName}
                    </h2>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {t("scenarioAttemptSummary", {
                        attemptCount: scenario.attemptCount,
                        retryCount: scenario.retryCount,
                      })}
                    </p>
                    {scenario.attempts.length === 0 ? (
                      <p className="text-sm">{t("noAttempts")}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <caption className="sr-only">
                            {t("attemptCaption", {
                              name: scenario.personaName,
                            })}
                          </caption>
                          <thead>
                            <tr className="border-b text-left">
                              <th scope="col">{t("attempt")}</th>
                              <th scope="col">{t("score")}</th>
                              <th scope="col">{t("result")}</th>
                              <th scope="col">{t("date")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scenario.attempts.map((attempt) => (
                              <tr key={attempt.id} className="border-b">
                                <th scope="row" className="py-2 text-left">
                                  #{attempt.attemptNumber}
                                  {scenario.bestAttempt?.id === attempt.id ? (
                                    <span className="ml-2 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                                      {t("best")}
                                    </span>
                                  ) : null}
                                </th>
                                <td>
                                  {attempt.overallScore ?? t("notAvailable")}
                                </td>
                                <td>
                                  {attempt.passed == null
                                    ? t("pending")
                                    : attempt.passed
                                      ? t("passed")
                                      : t("retry")}
                                </td>
                                <td>
                                  {dateFormatter.format(
                                    new Date(attempt.createdAt),
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("repNotFound")}</p>
      )}
    </div>
  );
}

/** Resolves the locale route parameter before rendering representative detail. */
export default function RepDetailPage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = use(params);
  return <RepDetailContent repId={repId} />;
}
