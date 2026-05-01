import SystemSchoolReports from "@/components/system/school-reports";
import React from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function SystemSchoolReportsPage({
  params,
}: {
  params: Promise<{ licenseId: string }>;
}) {
  const { licenseId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    return redirect("/auth/signin");
  }

  if (user?.role !== Role.SYSTEM) {
    return redirect("/");
  }

  return (
    <div>
      <SystemSchoolReports licenseId={licenseId} />
    </div>
  );
}
