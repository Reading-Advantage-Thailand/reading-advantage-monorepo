import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function StudentsManagementPage() {
  await requireRole('ADMIN');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600 mt-2">
            Manage student enrollment and records
          </p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700">
          Add New Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
          <CardDescription>School student roster</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Student directory will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
