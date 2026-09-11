import React from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-guard";
import AdminArticleCreation from "@/components/admin/article-creation";

export default async function AdminDashboardPage() {
  const user = await requireUser();

  if (!user.license_id) {
    return redirect("/");
  }

  return (
    <>
      <AdminArticleCreation />
    </>
  );
}
