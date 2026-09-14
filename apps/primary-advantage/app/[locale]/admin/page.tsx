import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  Plus,
  Settings,
  BarChart3,
  UserCheck,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { AdminRecentActivity } from "@/components/admin/admin-recent-activity";
import { AdminQuickActions } from "@/components/admin/admin-quick-actions";
import { AdminOverviewCharts } from "@/components/admin/admin-overview-charts";
import { AdminDashboardHeader } from "@/components/admin/admin-dashboard-header";

interface AdminPageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { locale } = await params;

  return redirect({ href: "/admin/dashboard", locale });
  // <div className="space-y-8">
    //   {/* Header */}
    //   <AdminDashboardHeader />

    //   {/* Stats Cards */}
    //   <Suspense fallback={<StatsCardsSkeleton />}>
    //     <AdminStatsCards />
    //   </Suspense>



    //   {/* Overview Charts */}
    //   <div className="space-y-6">
    //     <h2 className="text-xl font-semibold">{t("charts.title")}</h2>
    //     <AdminOverviewCharts />
    //   </div>


}

// Loading Skeletons
function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
``;
