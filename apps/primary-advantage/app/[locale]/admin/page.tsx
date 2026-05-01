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
import { Link } from "@/i18n/navigation";
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
  const t = await getTranslations("AdminDashboard");

  return (
    <div></div>
    // <div className="space-y-8">
    //   {/* Header */}
    //   <AdminDashboardHeader />

    //   {/* Stats Cards */}
    //   <Suspense fallback={<StatsCardsSkeleton />}>
    //     <AdminStatsCards />
    //   </Suspense>

    //   {/* Main Content Grid */}
    //   <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-4">
    //     {/* Quick Actions */}
    //     <div className="lg:col-span-1 xl:col-span-1">
    //       <Card>
    //         <CardHeader>
    //           <CardTitle className="flex items-center gap-2">
    //             <Settings className="h-5 w-5" />
    //             {t("quickActions.title")}
    //           </CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           <Suspense fallback={<QuickActionsSkeleton />}>
    //             <AdminQuickActions />
    //           </Suspense>
    //         </CardContent>
    //       </Card>
    //     </div>

    //     {/* Recent Activity */}
    //     <div className="lg:col-span-2 xl:col-span-3">
    //       <Card>
    //         <CardHeader>
    //           <CardTitle className="flex items-center gap-2">
    //             <Clock className="h-5 w-5" />
    //             {t("recentActivity.title")}
    //           </CardTitle>
    //         </CardHeader>
    //         <CardContent>
    //           <Suspense fallback={<RecentActivitySkeleton />}>
    //             <AdminRecentActivity />
    //           </Suspense>
    //         </CardContent>
    //       </Card>
    //     </div>
    //   </div>

    //   {/* Overview Charts */}
    //   <div className="space-y-6">
    //     <h2 className="text-xl font-semibold">{t("charts.title")}</h2>
    //     <AdminOverviewCharts />
    //   </div>

    //   {/* System Status */}
    //   <div className="grid gap-6 md:grid-cols-2">
    //     <Card>
    //       <CardHeader>
    //         <CardTitle className="flex items-center gap-2">
    //           <BarChart3 className="h-5 w-5" />
    //           {t("systemStatus.title")}
    //         </CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="space-y-4">
    //           <div className="flex items-center justify-between">
    //             <span className="text-sm font-medium">
    //               {t("systemStatus.serverHealth")}
    //             </span>
    //             <Badge
    //               variant="secondary"
    //               className="bg-green-100 text-green-800"
    //             >
    //               {t("systemStatus.healthy")}
    //             </Badge>
    //           </div>
    //           <div className="flex items-center justify-between">
    //             <span className="text-sm font-medium">
    //               {t("systemStatus.database")}
    //             </span>
    //             <Badge
    //               variant="secondary"
    //               className="bg-green-100 text-green-800"
    //             >
    //               {t("systemStatus.connected")}
    //             </Badge>
    //           </div>
    //           <div className="flex items-center justify-between">
    //             <span className="text-sm font-medium">
    //               {t("systemStatus.aiServices")}
    //             </span>
    //             <Badge
    //               variant="secondary"
    //               className="bg-green-100 text-green-800"
    //             >
    //               {t("systemStatus.operational")}
    //             </Badge>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>

    //     <Card>
    //       <CardHeader>
    //         <CardTitle className="flex items-center gap-2">
    //           <AlertCircle className="h-5 w-5" />
    //           {t("alerts.title")}
    //         </CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="space-y-3">
    //           <div className="flex items-start gap-3 rounded-lg border p-3">
    //             <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
    //             <div className="space-y-1">
    //               <p className="text-sm font-medium">
    //                 {t("alerts.lowStorage.title")}
    //               </p>
    //               <p className="text-muted-foreground text-xs">
    //                 {t("alerts.lowStorage.description")}
    //               </p>
    //             </div>
    //           </div>
    //           <div className="flex items-start gap-3 rounded-lg border p-3">
    //             <UserCheck className="mt-0.5 h-4 w-4 text-blue-500" />
    //             <div className="space-y-1">
    //               <p className="text-sm font-medium">
    //                 {t("alerts.newRegistrations.title")}
    //               </p>
    //               <p className="text-muted-foreground text-xs">
    //                 {t("alerts.newRegistrations.description")}
    //               </p>
    //             </div>
    //           </div>
    //         </div>
    //       </CardContent>
    //     </Card>
    //   </div>
    // </div>
  );
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
