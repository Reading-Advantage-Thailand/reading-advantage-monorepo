import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function SchoolsManagementPage() {
  await requireRole('SYSTEM');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">School Management</h1>
          <p className="text-gray-600 mt-2">
            Manage all schools in the platform
          </p>
        </div>
        <Button className="bg-rose-600 hover:bg-rose-700">
          Add New School
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Schools</CardTitle>
          <CardDescription>Schools registered in the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">School directory will appear here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
