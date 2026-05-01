import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import GoalsPageContent from "@/components/goals/goals-page-content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Learning Goals - Reading Advantage",
  description: "Set and track your learning goals",
};

export default async function GoalsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Learning Goals</h1>
        <p className="text-muted-foreground mt-2">
          Set goals, track progress, and stay motivated on your learning journey
        </p>
      </div>

      <Suspense fallback={<GoalsPageSkeleton />}>
        <GoalsPageContent userId={user.id} />
      </Suspense>
    </div>
  );
}

function GoalsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
