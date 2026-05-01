import { UserActivityChart } from "@/components/dashboard/user-activity-chart";
import { UserXpOverAllChart } from "@/components/dashboard/user-xpoverall-chart";
import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import React from "react";
import { getScopedI18n } from "@/locales/server";
import { redirect } from "next/navigation";
import UserActivityHeatMap from "@/components/dashboard/user-activity-heatmap";
import ReadingStatsChart from "@/components/dashboard/user-reading-chart";
import CEFRLevels from "@/components/dashboard/user-level-indicator";
import { fetchData } from "@/utils/fetch-data";

async function getUserActivityData(userId: string) {
  return fetchData(`/api/v1/users/${userId}/activitylog`);
}

async function getStudentData(studentId: string) {
  return fetchData(`/api/v1/users/${studentId}/student-data`);
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const user = await getCurrentUser();
  if (!user) return redirect("/auth/signin");
  const t = await getScopedI18n("pages.teacher.studentProgressPage");

  try {
    const [activityResponse, studentResponse] = await Promise.all([
      getUserActivityData(studentId),
      getStudentData(studentId),
    ]);

    const activityData = activityResponse.activityLogs;
    const studentData = studentResponse.data;

    return (
      <>
        <div>
          <Header
            heading={t("progressOf", {
              nameOfStudent: studentData.display_name,
            })}
          />
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3 mt-4 mb-10">
            <div className="flex flex-col gap-4 col-span-2">
              <UserActivityChart data={activityData} />
              <UserXpOverAllChart data={activityData} />
              <ReadingStatsChart data={activityData} />
            </div>
            <div className="flex flex-col gap-4">
              <CEFRLevels currentLevel={studentData.cefr_level} />
              <UserActivityHeatMap data={activityData} />
            </div>
          </div>
        </div>
      </>
    );
  } catch (error) {
    console.error("Error fetching student data:", error);
    return (
      <div>
        <Header heading="Error" />
        <p>Failed to load student progress data.</p>
      </div>
    );
  }
}
