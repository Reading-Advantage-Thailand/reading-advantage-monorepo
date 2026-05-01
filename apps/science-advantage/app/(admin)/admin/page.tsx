import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminPage() {
  const session = await requireRole('ADMIN');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          School administration dashboard - Manage teachers, students, and school operations
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Teachers</CardTitle>
            <CardDescription>Manage teaching staff</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Teacher management tools coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>Manage student enrollment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Student management tools coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Performance</CardTitle>
            <CardDescription>Overall school metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Performance analytics coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reports</CardTitle>
            <CardDescription>Generate school reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Reporting tools coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
