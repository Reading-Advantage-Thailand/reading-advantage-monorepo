import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AssignmentsPage() {
  await requireRole('STUDENT');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Assignments</h1>
        <p className="text-gray-600 mt-2">
          View and complete your assigned work
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assignments</CardTitle>
          <CardDescription>Your assigned coursework and activities</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No assignments available yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}
