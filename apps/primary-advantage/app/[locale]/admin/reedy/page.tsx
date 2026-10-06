import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getSchoolVoiceCosts, type SchoolVoiceCosts } from "@reading-advantage/domain/primary-voice";
import { EmptyState, ErrorState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { minutesText } from "@/components/reedy/reedy-meter";

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * The admin and system cost view of Reedy (FR-14): cost by school and month, failed starts,
 * disconnects, and summary failures. An ADMIN sees the own school; SYSTEM sees every school.
 * @returns The page.
 */
export default async function AdminReedyCostsPage() {
  const [user, t] = await Promise.all([currentUser(), getTranslations("ReedyUsage")]);
  let costs: SchoolVoiceCosts | null = null;
  let failed = false;
  if (user) {
    try {
      costs = await getSchoolVoiceCosts({ db, user, months: 3 });
    } catch {
      failed = true;
    }
  }
  if (!costs) {
    return <ErrorState className="bg-card border" title={t("loadError")} description={failed ? t("loadErrorHint") : t("signInHint")} />;
  }
  const ops = costs.operations;
  const stats = [
    { label: t("attempts"), value: String(ops.attempts) },
    { label: t("failedStarts"), value: `${ops.failedStarts} (${percent(ops.failedStartRate)})` },
    { label: t("disconnects"), value: `${ops.disconnected} (${percent(ops.disconnectRate)})` },
    { label: t("summaryFailures"), value: `${ops.summaryFailures} (${percent(ops.summaryFailureRate)})` },
    { label: t("measuredCostUsd"), value: `$${ops.totalMeasuredCostUsd.toFixed(2)}` },
    { label: t("missingCost"), value: String(ops.missingCostSessions) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("costsTitle")}</h1>
        <p className="text-muted-foreground">{t("costsHint")}</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card flex flex-col gap-1 rounded-2xl border p-4 shadow-sm">
            <dt className="text-muted-foreground text-sm">{s.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {costs.months.length === 0 ? (
        <EmptyState className="bg-card border" title={t("noCosts")} description={t("noCostsHint")} />
      ) : (
        <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("month")}</TableHead>
                <TableHead>{t("school")}</TableHead>
                <TableHead className="text-right">{t("minutes")}</TableHead>
                <TableHead className="text-right">{t("sessions")}</TableHead>
                <TableHead className="text-right">{t("costThb")}</TableHead>
                <TableHead className="text-right">{t("failedStarts")}</TableHead>
                <TableHead className="text-right">{t("disconnects")}</TableHead>
                <TableHead className="text-right">{t("safetyEvents")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.months.map((m) => (
                <TableRow key={`${m.schoolId}/${m.month}`} data-testid="reedy-month">
                  <TableCell className="font-medium tabular-nums">{m.month}</TableCell>
                  <TableCell>{m.schoolName || m.schoolId}</TableCell>
                  <TableCell className="text-right tabular-nums">{minutesText(m.secondsUsed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.sessionCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.costThb.toFixed(2)}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.failedStarts}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.disconnected}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.safetyEvents}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
