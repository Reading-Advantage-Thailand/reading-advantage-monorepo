import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getClassVoiceUsage, voiceConfigFromEnv, type ClassVoiceUsage } from "@reading-advantage/domain/primary-voice";
import { EmptyState, ErrorState } from "@reading-advantage/ui";
import { currentUser } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { minutesText } from "@/components/reedy/reedy-meter";

/** The Reedy limits of this process. */
const voiceConfig = voiceConfigFromEnv(process.env);

/**
 * The teacher's Reedy usage view of one class (FR-13): minutes, sessions, last use, and average
 * scores per student this month, the students with no use, and safety event counts (FR-15).
 * @param props.params The route params with the class id.
 * @returns The page.
 */
export default async function ClassReedyUsagePage({ params }: { params: Promise<{ classroomId: string }> }) {
  const [{ classroomId }, user, t] = await Promise.all([params, currentUser(), getTranslations("ReedyUsage")]);
  let usage: ClassVoiceUsage | null = null;
  let failed = false;
  if (user) {
    try {
      usage = await getClassVoiceUsage({ db, user, classroomId, config: voiceConfig });
    } catch {
      failed = true;
    }
  }
  const back = (
    <Link href={`/teacher/class-roster/${classroomId}`} className="text-muted-foreground inline-flex min-h-11 items-center gap-2 text-sm hover:underline">
      <ArrowLeftIcon aria-hidden="true" className="size-4" />
      {t("backToClass")}
    </Link>
  );
  if (!usage) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <ErrorState className="bg-card border" title={t("loadError")} description={failed ? t("loadErrorHint") : t("signInHint")} />
      </div>
    );
  }
  const stats = [
    { label: t("minutesUsed"), value: minutesText(usage.totalSeconds) },
    { label: t("sessions"), value: String(usage.totalSessions) },
    { label: t("studentsWithUse"), value: `${usage.studentsWithUse} / ${usage.studentCount}` },
    { label: t("safetyEvents"), value: String(usage.safetyEvents) },
  ];
  return (
    <div className="flex flex-col gap-6">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("monthHint", { month: usage.month, budget: minutesText(usage.budgetSeconds) })}</p>
      </header>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card flex flex-col gap-1 rounded-2xl border p-4 shadow-sm">
            <dt className="text-muted-foreground text-sm">{s.label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {usage.students.length === 0 ? (
        <EmptyState className="bg-card border" title={t("noStudents")} description={t("noStudentsHint")} />
      ) : (
        <div className="bg-card overflow-x-auto rounded-2xl border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("student")}</TableHead>
                <TableHead className="text-right">{t("minutes")}</TableHead>
                <TableHead className="text-right">{t("sessions")}</TableHead>
                <TableHead>{t("lastUse")}</TableHead>
                <TableHead>{t("averageScores")}</TableHead>
                <TableHead className="text-right">{t("safetyEvents")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.students.map((s) => (
                <TableRow key={s.userId} data-testid="reedy-student">
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{minutesText(s.secondsUsed)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.sessionCount}</TableCell>
                  <TableCell>{s.lastUseAt ? s.lastUseAt.toLocaleDateString("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }) : t("noUse")}</TableCell>
                  <TableCell>
                    {s.averageScores
                      ? `${t("scoreShort.fluency")} ${s.averageScores.fluency} · ${t("scoreShort.grammar")} ${s.averageScores.grammar} · ${t("scoreShort.vocabulary")} ${s.averageScores.vocabulary} · ${t("scoreShort.pronunciation")} ${s.averageScores.pronunciation}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.safetyEvents}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <p className="text-muted-foreground text-sm">{t("privacyNote")}</p>
    </div>
  );
}
