"use client";

import React, { useState, useEffect } from "react";
import AdminReports from "@/components/admin/reports";
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

interface ClassroomData {
  id: string;
  classroomName: string;
  classCode: string;
  grade: string;
  archived: boolean;
  title: string;
  importedFromGoogle: boolean;
  alternateLink: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
  } | string | null;
  isOwner: boolean;
  teachers: Array<{
    teacherId: string;
    name: string;
    role: string;
    joinedAt: string;
  }>;
  student: Array<{
    studentId: string;
    email: string;
    lastActivity: string;
  }>;
  xpData?: {
    today: number;
    week: number;
    month: number;
    allTime: number;
  };
}

interface ReportsContentProps {
  initialClasses: ClassroomData[];
  userRole: Role;
  allLicenses?: License[];
  userLicenseId: string;
}

export default function ReportsContent({
  initialClasses,
  userRole,
  allLicenses = [],
  userLicenseId,
}: ReportsContentProps) {
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>(
    userRole === Role.SYSTEM && allLicenses.length > 0 
      ? allLicenses[0].id 
      : userLicenseId
  );
  const [classes, setClasses] = useState<ClassroomData[]>(initialClasses);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch classrooms when SYSTEM role and license is selected
  React.useEffect(() => {
    if (userRole === Role.SYSTEM && selectedLicenseId && selectedLicenseId !== userLicenseId) {
      fetchClassrooms(selectedLicenseId);
    }
  }, []);

  const fetchClassrooms = async (licenseId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/classroom?licenseId=${licenseId}`);
      const result = await response.json();
      if (result.data) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLicenseChange = (licenseId: string) => {
    setSelectedLicenseId(licenseId);
    fetchClassrooms(licenseId);
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-lg">Loading classroom data...</div>
        </div>
      ) : (
        <AdminReports classes={classes} />
      )}
    </>
  );
}
