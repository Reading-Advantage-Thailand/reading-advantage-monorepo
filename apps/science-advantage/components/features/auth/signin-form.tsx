'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DEMO_ACCOUNTS = [
  { username: 'student_demo', password: 'Password123!', role: 'Student' },
  { username: 'teacher_demo', password: 'Password123!', role: 'Teacher' },
  { username: 'admin_demo', password: 'Password123!', role: 'School Admin' },
  { username: 'system_demo', password: 'Password123!', role: 'System Admin' },
];

export function SigninForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-semibold mb-4">Sign In</h2>
          <p className="text-muted-foreground">
            The sign-in system is being updated. Please visit{" "}
            <a href="/" className="underline text-primary">
              the main site
            </a>{" "}
            to access your account.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Redirect based on role
      const roleRoutes = {
        STUDENT: '/student',
        TEACHER: '/teacher',
        ADMIN: '/admin',
        SYSTEM: '/system',
      };

      const redirectTo = roleRoutes[data.user.role as keyof typeof roleRoutes] || '/student';
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('An error occurred during login');
      setLoading(false);
    }
  };

  const fillDemo = (username: string, password: string) => {
    setUsername(username);
    setPassword(password);
    setError('');
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <Card className="border-rose-200">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-rose-800">Sign In</CardTitle>
          <CardDescription>
            Enter your username and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                className="border-rose-200 focus:border-rose-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-rose-200 focus:border-rose-500"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-rose-200 bg-rose-50">
        <CardHeader>
          <CardTitle className="text-lg text-rose-800">Demo Accounts</CardTitle>
          <CardDescription>
            Click to auto-fill login credentials for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              onClick={() => fillDemo(account.username, account.password)}
              className="w-full text-left p-3 bg-white hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
              type="button"
            >
              <div className="font-semibold text-rose-800">{account.role}</div>
              <div className="text-sm text-gray-600">
                {account.username} / {account.password}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
