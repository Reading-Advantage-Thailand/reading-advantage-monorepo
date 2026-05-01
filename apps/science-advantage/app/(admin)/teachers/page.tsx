import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function TeachersManagementPage() {
  await requireRole('ADMIN');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600 mt-2">
            Manage teaching staff and assignments
          </p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700">
          Add New Teacher
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>School teaching staff</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Teacher directory will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
