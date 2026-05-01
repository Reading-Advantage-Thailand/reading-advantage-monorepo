import React from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import ReportsContent from "@/components/admin/reports-content";

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return redirect("/auth/signin");
  }

  if (user?.role !== Role.SYSTEM && user?.role !== Role.ADMIN) {
    return redirect("/");
  }

  if (!user.license_id) {
    return redirect("/");
  }

  const ClassesData = async () => {
    try {
      const requestHeaders = await headers();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom`,
        { 
          method: "GET", 
          headers: requestHeaders,
          cache: 'no-store'
        }
      );
      
      if (!res.ok) throw new Error("Failed to fetch classroom list");
      const fetchdata = await res.json();
      
      return fetchdata.data || [];
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      return [];
    }
  };

  // Get all licenses if user is SYSTEM
  const getAllLicensesData = async () => {
    if (user.role !== Role.SYSTEM) {
      return [];
    }
    
    try {
      const requestHeaders = await headers();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/licenses`,
        { method: "GET", headers: requestHeaders, cache: 'no-store' }
      );
      const fetchdata = await res.json();
      return fetchdata.data || [];
    } catch (error) {
      console.error("Error fetching licenses:", error);
      return [];
    }
  };

  const classData = await ClassesData();
  const allLicenses = await getAllLicensesData();

  return (
    <div>
      <ReportsContent
        initialClasses={classData}
        userRole={user.role}
        allLicenses={allLicenses}
        userLicenseId={user.license_id}
      />
    </div>
  );
}
