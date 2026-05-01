import SystemReports from "@/components/system/reports";
import React from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function SystemReportsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return redirect("/auth/signin");
  }

  if (user?.role !== Role.SYSTEM) {
    return redirect("/");
  }

  return (
    <div>
      <SystemReports />
    </div>
  );
}
