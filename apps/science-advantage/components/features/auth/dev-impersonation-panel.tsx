'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEMO_USERS = [
  {
    id: 'student-1',
    name: 'Student User',
    role: 'STUDENT',
    email: 'student@demo.local',
  },
  {
    id: 'teacher-1',
    name: 'Teacher User',
    role: 'TEACHER',
    email: 'teacher@demo.local',
  },
  {
    id: 'admin-1',
    name: 'School Admin',
    role: 'ADMIN',
    email: 'admin@demo.local',
  },
  {
    id: 'system-1',
    name: 'System Admin',
    role: 'SYSTEM',
    email: 'system@demo.local',
  },
];

export function DevImpersonationPanel() {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImpersonate = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Impersonation failed');
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impersonation failed');
      setLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50 w-full max-w-md mt-4">
      <CardHeader>
        <CardTitle className="text-lg text-amber-800">
          Dev Impersonation
        </CardTitle>
        <CardDescription className="text-amber-700">
          Quick login as a demo user for development
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="demo-user">Select Demo User</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger id="demo-user" className="border-amber-300">
              <SelectValue placeholder="Choose a demo user..." />
            </SelectTrigger>
            <SelectContent>
              {DEMO_USERS.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
            {error}
          </div>
        )}

        <Button
          onClick={handleImpersonate}
          disabled={!selectedUserId || loading}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {loading ? 'Signing in...' : 'Impersonate User'}
        </Button>
      </CardContent>
    </Card>
  );
}
