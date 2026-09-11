import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { GoalsService } from "@/server/services/goals-service";
import GoalsPageContent from "@/components/goals/goals-page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

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
        <GoalsData userId={user.id} />
      </Suspense>
    </div>
  );
}

/**
 * Fetches the goals and summary on the server so the client component
 * receives them as props. Renders a real error state when the fetch fails.
 * @param userId The student user id.
 * @returns The goals page content with server-fetched props.
 */
async function GoalsData({ userId }: { userId: string }) {
  try {
    await GoalsService.syncProgressFromActivities(userId);
    const [goals, summary] = await Promise.all([
      GoalsService.getUserGoals(userId, undefined, true),
      GoalsService.getUserGoalSummary(userId),
    ]);

    return (
      <GoalsPageContent
        userId={userId}
        initialGoals={goals}
        initialSummary={summary}
      />
    );
  } catch (error) {
    console.error("Error fetching goals on the server:", error);
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load goals</h3>
          <p className="text-muted-foreground text-center">
            Something went wrong while loading your goals. Please try again
            later.
          </p>
        </CardContent>
      </Card>
    );
  }
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
