"use client";

import { useAuth } from "@reading-advantage/auth-client";
import { trpc } from "@/lib/trpc";
import { Button } from "@reading-advantage/ui";
import { Progress } from "@reading-advantage/ui";
import {
  UserPlus,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: interns, isLoading: dataLoading } = trpc.codecamp.listInterns.useQuery(
    undefined,
    { enabled: user?.role === "ADMIN" }
  );

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            You need admin privileges to view this page.
          </p>
          <Button asChild>
            <a href="/">Back to Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = dataLoading;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage intern accounts and track cohort progress
          </p>
        </div>
        <Button asChild>
          <a href="/admin/new-intern">
            <UserPlus className="mr-2 h-4 w-4" />
            New Intern
          </a>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Interns</p>
          <p className="mt-2 text-3xl font-bold">
            {isLoading ? "—" : interns?.length ?? 0}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Avg. Progress</p>
          <p className="mt-2 text-3xl font-bold">
            {isLoading
              ? "—"
              : interns && interns.length > 0
                ? `${Math.round(
                    interns.reduce((s: number, i: { overallProgress: number }) => s + i.overallProgress, 0) / interns.length
                  )}%`
                : "0%"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-sm text-muted-foreground">Pending Reviews</p>
          <p className="mt-2 text-3xl font-bold">
            {isLoading
              ? "—"
              : interns?.reduce((s, i) => s + i.prReviewsPending, 0) ?? 0}
          </p>
        </div>
      </div>

      {/* Interns Table */}
      <div className="rounded-lg border">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Cohort Overview</h2>
        </div>
        {isLoading ? (
          <div className="p-8">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </div>
        ) : !interns || interns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No interns found.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create intern accounts to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Username</th>
                  <th className="px-4 py-3 text-left font-medium">Progress</th>
                  <th className="px-4 py-3 text-left font-medium">Modules</th>
                  <th className="px-4 py-3 text-left font-medium">Quiz Avg</th>
                  <th className="px-4 py-3 text-left font-medium">PR Reviews</th>
                  <th className="px-4 py-3 text-left font-medium">Last Active</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {interns.map((intern: {
                  userId: string;
                  name: string | null;
                  username: string;
                  overallProgress: number;
                  completedModules: number;
                  totalModules: number;
                  quizAverage: number;
                  prReviewsPending: number;
                  prReviewsApproved: number;
                  lastActiveAt: Date | null;
                }) => (
                  <tr key={intern.userId} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{intern.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      @{intern.username}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={intern.overallProgress}
                          className="h-2 w-24"
                        />
                        <span className="text-xs text-muted-foreground">
                          {intern.overallProgress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        <span>
                          {intern.completedModules}/{intern.totalModules}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{intern.quizAverage}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {intern.prReviewsPending > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {intern.prReviewsPending}
                          </span>
                        )}
                        {intern.prReviewsApproved > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {intern.prReviewsApproved}
                          </span>
                        )}
                        {intern.prReviewsPending === 0 && intern.prReviewsApproved === 0 && (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {intern.lastActiveAt
                          ? new Date(intern.lastActiveAt).toLocaleDateString()
                          : "Never"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/admin/${intern.userId}`}>
                          Details
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
