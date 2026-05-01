import { requireRole } from '@/lib/auth/server';
import { TeacherDashboardClasses } from '@/components/features/teacher/teacher-dashboard-classes';
import { InterventionAlertsWidget } from '@/components/features/teacher/intervention-alerts-widget';
import { ClassProgressCard } from '@/components/features/teacher/class-progress-card';
import { StudentsNeedAttentionCard } from '@/components/features/teacher/students-need-attention-card';
import { RecentCompletionsFeed } from '@/components/features/teacher/recent-completions-feed';
import prisma from '@/lib/prisma';

export default async function TeacherPage() {
  const session = await requireRole('TEACHER');

  // Fetch teacher's classes for intervention widget
  const teacherClasses = await prisma.class.findMany({
    where: { teacherId: session.user.id },
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold edu-title">
          Welcome, {session.user.name}! 🍎
        </h1>
        <p className="text-muted-foreground">
          Manage your classes, assignments, and student progress from one place.
        </p>
        <p className="text-sm text-muted-foreground">
          ยินดีต้อนรับ! จัดการชั้นเรียน งานมอบหมาย
          และความก้าวหน้าของนักเรียนได้จากที่เดียว
        </p>
      </header>

      {teacherClasses.length > 0 && (
        <InterventionAlertsWidget
          initialClassId={teacherClasses[0].id}
          classes={teacherClasses}
        />
      )}

      <TeacherDashboardClasses />

      <section className="grid gap-6 md:grid-cols-2">
        <ClassProgressCard />
        <StudentsNeedAttentionCard />
      </section>

      <RecentCompletionsFeed />
    </div>
  );
}
