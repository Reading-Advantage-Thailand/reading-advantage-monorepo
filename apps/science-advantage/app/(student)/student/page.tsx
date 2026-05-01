import { requireRole } from '@/lib/auth/server';
import { JoinClassForm } from '@/components/features/student/join-class-form';
import { StudentClassesSection } from '@/components/features/student/student-classes-section';
import { StudentAssignmentsCard } from '@/components/features/student/student-assignments-card';
import { GamificationDashboardCard } from '@/components/features/student/gamification-dashboard-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function StudentPage() {
  const session = await requireRole('STUDENT');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold edu-title">
          Welcome, {session.user.name}! 🎓
        </h1>
        <p className="text-muted-foreground mt-2">
          Your student dashboard - View your classes, assignments, and progress
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="edu-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📚 My Classes
            </CardTitle>
            <CardDescription>Classes you&apos;re enrolled in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StudentClassesSection />
            <div className="space-y-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4">
              <div>
                <h3 className="text-sm font-semibold">Join another class</h3>
                <p className="text-sm text-muted-foreground">
                  Enter 6-character code from your teacher.
                </p>
              </div>
              <div className="rounded-2xl bg-card p-4 shadow-md">
                <JoinClassForm />
              </div>
            </div>
          </CardContent>
        </Card>

        <StudentAssignmentsCard studentId={session.user.id} />

        <Card className="edu-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⭐ Recent Activity
            </CardTitle>
            <CardDescription>Your latest learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity.</p>
          </CardContent>
        </Card>

        <Card className="edu-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Progress
            </CardTitle>
            <CardDescription>Your XP, level, streak, and badges</CardDescription>
          </CardHeader>
          <CardContent>
            <GamificationDashboardCard studentId={session.user.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
