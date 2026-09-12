import React from "react";
import StudentAssignmentTable from "@/components/student-assignment-dashboard";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AssignmentPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return redirect("/auth/signin");
  }

  return (
    <div>
      <StudentAssignmentTable userId={user.id} />
    </div>
  );
}
