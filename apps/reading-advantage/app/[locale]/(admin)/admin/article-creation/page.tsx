import React from "react";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import UnauthorizedPage from "@/components/shared/unauthorized-page";
import AdminArticleCreation from "@/components/admin/article-creation";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  if (!user.license_id) {
    return <UnauthorizedPage />;
  }

  return (
    <>
      <AdminArticleCreation />
    </>
  );
}
