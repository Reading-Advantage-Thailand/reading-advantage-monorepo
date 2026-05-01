import ChangeRole from "@/components/shared/change-role";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import React from "react";
import { SessionSyncRedirect } from "@/components/session-sync-redirect";

export default async function FirstRoleSelectionPage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  // If DB says STUDENT but user is here (meaning Cookie likely says USER -> Middleware allowed entry)
  // We need to SYNC the cookie to match the DB, then redirect to Dashboard.
  // This prevents the Loop.
  else if (user.role === Role.STUDENT) {
    return (
      <div className="flex justify-center pt-20">
        <SessionSyncRedirect />
      </div>
    );
  } else if (user.role === Role.TEACHER) {
    return (
      <div className="flex justify-center pt-20">
        <SessionSyncRedirect />
      </div>
    );
  } else if (user.role !== Role.USER) {
    return redirect("/");
  }

  // If user is indeed USER (Role not selected), show selection screen
  return (
    <div className="flex justify-center">
      <ChangeRole
        className="md:w-[40rem]"
        userRole={user.role}
        userId={user.id}
      />
    </div>
  );
}
