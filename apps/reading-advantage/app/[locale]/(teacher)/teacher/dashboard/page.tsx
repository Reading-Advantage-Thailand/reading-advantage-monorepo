import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { Role } from "@prisma/client";
import { TeacherDashboardContent } from "@/components/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getScopedI18n } from "@/locales/server";

export const metadata = {
  title: "Teacher Dashboard | Reading Advantage",
  description:
    "Monitor your classes, track student progress, and get AI-powered insights",
};

// Skeleton loader for the dashboard
function DashboardSkeleton() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default async function TeacherDashboardPage() {
  // Check authentication and authorization
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Only allow teachers and admins
  if (
    user.role !== Role.TEACHER &&
    user.role !== Role.ADMIN &&
    user.role !== Role.SYSTEM
  ) {
    redirect("/");
  }
  const t = await getScopedI18n("pages.teacher.dashboard");

  return (
    <div className="container mx-auto pb-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <TeacherDashboardContent userId={user.id} />
      </Suspense>
    </div>
  );
}
