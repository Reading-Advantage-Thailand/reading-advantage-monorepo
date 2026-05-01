import { requireAuth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { StudentMasteryProfile } from '@/components/features/student/mastery-profile/student-mastery-profile';

export const metadata = {
  title: 'My Learning Profile | Science Advantage',
  description: 'View your mastery progress across all science standards',
};

export default async function StudentProfilePage() {
  const session = await requireAuth();

  // Students can only view their own profile
  if (session.user.role !== 'STUDENT') {
    redirect('/student');
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Learning Profile</h1>
        <p className="text-muted-foreground mt-2">
          Track your mastery progress and see where to focus next
        </p>
      </div>

      <StudentMasteryProfile studentId={session.user.id} />
    </div>
  );
}
