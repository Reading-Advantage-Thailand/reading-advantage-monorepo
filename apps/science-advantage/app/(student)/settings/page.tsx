import { requireAuth } from '@/lib/auth/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Bell, Globe } from 'lucide-react';

export default async function SettingsPage() {
  const session = await requireAuth();
  const user = session.user;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account settings and preferences.</p>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>Your personal account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <p className="mt-1 text-gray-900">{user.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-gray-900">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Role</label>
            <div className="mt-1">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {user.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              Notification settings will be available in a future update.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Language Preferences - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language Preferences
          </CardTitle>
          <CardDescription>Choose your preferred language for the interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-600">
              Language settings will be available in a future update.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Support for Thai (ไทย) and English coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
