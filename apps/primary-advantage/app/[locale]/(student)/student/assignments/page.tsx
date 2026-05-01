import { currentUser } from "@/lib/session";
import React from "react";
import AuthErrorPage from "@/app/[locale]/auth/error/page";
import StudentAssignmentTable from "@/components/student-assignment-table";

export default async function AssignmentsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }
  return <StudentAssignmentTable />;
}
