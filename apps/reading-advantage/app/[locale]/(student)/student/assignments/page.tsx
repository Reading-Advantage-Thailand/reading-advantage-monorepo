import React from "react";
import StudentAssignmentTable from "@/components/student-assignment-dashboard";
import { getCurrentUser } from "@/lib/session";

export default async function AssignmentPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return <div>Please log in to view assignments.</div>;
  }

  return (
    <div>
      <StudentAssignmentTable userId={user.id} />
    </div>
  );
}
