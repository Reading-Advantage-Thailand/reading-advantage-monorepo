import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }

  // Redirect to teacher dashboard which shows classes
  return redirect("/th/teacher/dashboard");
}
