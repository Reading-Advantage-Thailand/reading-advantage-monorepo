import type { UserActivityLog, UserXpLog } from "@/types";
import UserRecentActivity from "./user-recent-activity";
import CEFRLevels from "./user-level-indicator";
import { UserActivityChart } from "./user-activity-chart";
import UserActivityHeatMap from "./user-heatmap-chart";
import { UserXpOverAllChart } from "./user-xpoverall-chart";
import ReadingStatsChart from "./user-reading-chart";

/**
 * The report panels of one student, shared by the student reports page and the teacher
 * student-progress page: recent activity, then the charts (two columns from 768 px) and the level
 * gauge with the heatmap. Below 768 px everything is one column (the old grid made the chart
 * column span two columns of a one-column grid, so it overflowed the screen at 375 px).
 * @param props.activity The activity rows, newest first.
 * @param props.xpLogs The XP log rows.
 * @param props.cefrLevel The student's CEFR level.
 * @param props.audience Who reads the panels: the student (default) or a teacher (the level card
 * then names the level without the student-facing text).
 * @returns The panels.
 */
export function ReportPanels({
  activity,
  xpLogs,
  cefrLevel,
  audience = "student",
}: {
  activity: UserActivityLog[];
  xpLogs: UserXpLog[];
  cefrLevel: string;
  audience?: "student" | "teacher";
}) {
  return (
    <>
      <UserRecentActivity data={activity} />
      <div className="mt-4 mb-10 grid min-w-0 gap-4 md:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 md:col-span-2">
          <UserActivityChart data={activity} xpLogs={xpLogs} />
          <UserXpOverAllChart data={xpLogs} />
          <ReadingStatsChart data={activity} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <CEFRLevels currentLevel={cefrLevel} audience={audience} />
          <UserActivityHeatMap data={activity} />
        </div>
      </div>
    </>
  );
}
