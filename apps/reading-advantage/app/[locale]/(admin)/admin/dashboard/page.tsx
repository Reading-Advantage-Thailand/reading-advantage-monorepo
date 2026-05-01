import React, { Suspense } from "react";
import { Header } from "@/components/header";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import UnauthorizedPage from "@/components/shared/unauthorized-page";
import { SchoolDashboardContent } from "@/components/dashboard/school-dashboard-content";
import { Role } from "@prisma/client";
import { AdminOverviewResponse } from "@/types/dashboard";
import { KPICardSkeleton } from "@/components/dashboard/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";

// Loading skeleton for dashboard
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KPICardSkeleton />
        <KPICardSkeleton />
        <KPICardSkeleton />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[400px]" />
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  // RBAC Guard - Admins only
  if (!user) {
    return redirect("/auth/signin");
  }

  if (user.role !== Role.ADMIN && user.role !== Role.SYSTEM) {
    return <UnauthorizedPage />;
  }

  if (!user.license_id) {
    return <UnauthorizedPage />;
  }

  // Parallel data fetching for optimal performance
  const fetchDashboardData = async () => {
    const startTime = Date.now();
    const requestHeaders = await headers();

    try {
      const [overviewResponse, licensesResponse] = await Promise.all([
        // Fetch overview data
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/admin/overview`, {
          method: "GET",
          headers: requestHeaders,
          cache: "no-store",
          next: { revalidate: 60 }, // Cache for 60 seconds
        }),
        // Fetch all licenses if SYSTEM user
        user.role === Role.SYSTEM
          ? fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`, {
              method: "GET",
              headers: requestHeaders,
              cache: "no-store",
              next: { revalidate: 300 }, // Cache for 5 minutes
            })
          : Promise.resolve(null),
      ]);

      if (!overviewResponse.ok) {
        throw new Error(`Overview API returned ${overviewResponse.status}`);
      }

      const overview: AdminOverviewResponse = await overviewResponse.json();
      const licenses = licensesResponse?.ok
        ? (await licensesResponse.json()).data || []
        : [];

      const duration = Date.now() - startTime;
      console.log(`[Dashboard] Data fetched in ${duration}ms`);

      return { overview, licenses };
    } catch (error) {
      console.error("[Dashboard] Failed to fetch data:", error);
      throw error;
    }
  };

  const { overview, licenses } = await fetchDashboardData();

  return (
    <>
      <div className="text-xl sm:text-2xl md:text-3xl font-bold truncate mb-6">
        <Header heading="Admin Dashboard" />
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <SchoolDashboardContent
          initialOverview={overview}
          userRole={user.role}
          userLicenseId={user.license_id || undefined}
          allLicenses={licenses}
        />
      </Suspense>
    </>
  );
}
