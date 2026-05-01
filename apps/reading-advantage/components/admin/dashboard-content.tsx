"use client";

import React, { useState, useEffect } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LineChartCustom from "@/components/line-chart";
import ActiveUsersChart from "@/components/system/active-users";
import ClassRoomXpChart from "@/components/dashboard/classroom-xp-chart";
import LicenseSelector from "@/components/admin/license-selector";
import { Role } from "@prisma/client";

interface License {
  id: string;
  schoolName: string;
  maxUsers: number;
  expiresAt: Date;
  _count?: {
    licenseUsers: number;
  };
}

interface DashboardData {
  license: Array<{
    id: string;
    school_name: string;
    total_licenses: number;
    used_licenses: number;
    expires_at: Date;
  }>;
  filteredActivityLog: any[];
  averageCefrLevel: string;
  teacherCount: number;
  xpEarned: number;
}

interface DashboardContentProps {
  initialData: DashboardData;
  userRole: Role;
  allLicenses?: License[];
}

export default function DashboardContent({
  initialData,
  userRole,
  allLicenses = [],
}: DashboardContentProps) {
  const t = useScopedI18n("pages.admin.dashboard") as any;
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>(
    initialData.license[0]?.id || ""
  );
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDashboardData = async (licenseId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/admin/dashboard?licenseId=${licenseId}`
      );
      const result = await response.json();
      if (result.data) {
        setDashboardData(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLicenseChange = (licenseId: string) => {
    setSelectedLicenseId(licenseId);
    fetchDashboardData(licenseId);
  };

  return (
    <>
      {/* Show License Selector only for SYSTEM role */}
      {userRole === Role.SYSTEM && allLicenses.length > 0 && (
        <LicenseSelector
          licenses={allLicenses}
          selectedLicenseId={selectedLicenseId}
          onLicenseChange={handleLicenseChange}
        />
      )}

      <div className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
        <h1 className="px-2">
          {t("schoolLabel")} {dashboardData?.license[0]?.school_name}
        </h1>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-lg">{t("loading")}</div>
        </div>
      ) : (
        <>
          <div className="py-2 grid grid-cols-1 gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="min-h-10">
                <CardTitle className="text-1xl text-center">
                  {t("cards.totalLicensedUsers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-center">
                  {dashboardData?.license[0]?.used_licenses}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-1xl text-center">
                  {t("cards.averageCefrLevel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-center">
                  {dashboardData?.averageCefrLevel}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-1xl font-medium text-center">
                  {t("cards.totalXpGained")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-center">
                  {dashboardData?.xpEarned?.toLocaleString() || 0} {t("xpSuffix")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-1xl text-center">
                  {t("cards.licensedTeachers")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-center">
                  {dashboardData?.teacherCount}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="py-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl text-center">
                  {t("cards.averageArticleCefrLevel")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.filteredActivityLog &&
                dashboardData.filteredActivityLog.length > 0 ? (
                  <>
                    <LineChartCustom data={dashboardData.filteredActivityLog} />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {t("articleNote")}
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    <div className="text-center">
                      <p className="text-lg font-medium">{t("noDataTitle")}</p>
                      <p className="text-sm mt-2">{t("noArticleActivities")}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <ClassRoomXpChart licenseId={dashboardData?.license[0]?.id} />
          </div>

          <div className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-3">
            <ActiveUsersChart
              page={"admin"}
              licenseId={dashboardData?.license[0]?.id}
            />
          </div>
        </>
      )}
    </>
  );
}
