import React from "react";
import AuthErrorPage from "../../auth/error/page";
import { currentUser } from "@/lib/session";
import Assignments from "@/components/teacher/assignments";

export default async function AssignmentsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  return <Assignments />;
}
