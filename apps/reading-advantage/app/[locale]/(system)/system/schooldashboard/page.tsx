import React from "react";
import { Header } from "@/components/header";
import ShcoolsDashboard from "@/components/system/shcools-dashboard";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import UnauthorizedPage from "@/components/shared/unauthorized-page";
import { headers } from "next/headers";

export default async function SchoolsDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (user.role !== Role.SYSTEM) {
    return <UnauthorizedPage />;
  }

  const schoolListfetch = async () => {
    const requestHeaders = await headers();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`,
      { method: "GET", headers: requestHeaders }
    );
    if (!res.ok) throw new Error("Failed to fetch school list");
    const fetchdata = await res.json();
    return fetchdata;
  };

  const userRoleListfetch = async () => {
    const requestHeaders = await headers();
    const userRes = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users`,
      { method: "GET", headers: requestHeaders }
    );
    if (!userRes.ok) throw new Error("Failed to fetch user role list");
    const userData = await userRes.json();
    return userData;
  };

  const averageCefrLevelDatafetch = async () => {
    try {
      const requestHeaders = await headers();
      const cefrRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/activity/all`,
        {
          method: "GET",
          headers: requestHeaders,
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(30000), // 30 second timeout
        }
      );
      if (!cefrRes.ok) {
        console.warn("Failed to fetch CEFR level data, using fallback");
        return { data: [] }; // Return empty data as fallback
      }
      const cefrData = await cefrRes.json();
      return cefrData;
    } catch (error) {
      console.error("Error fetching CEFR data:", error);
      return { data: [] }; // Return empty data as fallback
    }
  };

  const schoolList = await schoolListfetch();
  const userRoleList = await userRoleListfetch();
  const averageCefrLevelData = await averageCefrLevelDatafetch();

  // Map the data to the expected structure for the component
  const mappedSchoolList = {
    data: (schoolList.data || []).map((license: any) => ({
      id: license.id,
      schoolName: license.schoolName,
      maxUsers: license.maxUsers,
      usedLicenses: license._count?.licenseUsers || 0, // Use count from Prisma
    })),
  };

  const mappedUserRoleList = {
    results: (userRoleList.results || []).map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      licenseId: user.licenseId,
      xp: user.xp?.toString() || "0",
      cefrLevel: user.cefrLevel,
    })),
  };

  const mappedCefrLevelData = {
    data: averageCefrLevelData.data || [],
  };

  return (
    <>
      <div className="text-xl sm:text-2xl md:text-3xl font-bold  truncate">
        <Header heading="Schools Dashboard Page" />
      </div>
      <ShcoolsDashboard
        schoolList={mappedSchoolList}
        userRoleList={mappedUserRoleList}
        averageCefrLevelData={mappedCefrLevelData}
      />
    </>
  );
}
