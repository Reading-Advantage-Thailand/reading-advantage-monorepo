import { requireRole } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function SystemPage() {
  const session = await requireRole('SYSTEM');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {session.user.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          System administration dashboard - Manage the entire platform
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Schools</CardTitle>
            <CardDescription>Manage all schools in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">School management tools coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Platform Statistics</CardTitle>
            <CardDescription>System-wide metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Platform analytics coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>Global system settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Configuration tools coming soon.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Platform status and monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Monitoring dashboard coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
