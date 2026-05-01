import { Header } from "@/components/header";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import React, { Suspense } from "react";
import { getScopedI18n } from "@/locales/server";
import { Skeleton } from "@/components/ui/skeleton";
import StudentDashboardContent from "@/components/dashboard/student-dashboard-content";

export default async function StudentDashboardPage() {
  const t = await getScopedI18n("pages.student.reportpage");
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  return (
    <>
      <Header heading={t("title")} />
      <div className="space-y-6">
        <Suspense fallback={<DashboardSkeleton />}>
          <StudentDashboardContent
            userId={user.id}
            user={{
              id: user.id,
              name: user.display_name,
              email: user.email,
              level: user.level,
              cefr_level: user.cefr_level,
              xp: user.xp,
            }}
          />
        </Suspense>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
      <div className="col-span-2 space-y-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    </div>
  );
}
