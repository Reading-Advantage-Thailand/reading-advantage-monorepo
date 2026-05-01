import TeacherAssignmentsTable from "@/components/admin/teacher-assignments-table";
import React from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export default async function TeacherAssignmentsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return redirect("/auth/signin");
  }

  if (user?.role !== Role.SYSTEM && user?.role !== Role.ADMIN) {
    return redirect("/");
  }

  return (
    <div>
      <TeacherAssignmentsTable />
    </div>
  );
}
