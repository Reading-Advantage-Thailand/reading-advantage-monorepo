import { SigninContainer } from '@/components/features/auth/signin-container';
import { getSession } from '@/lib/auth/server';
import { env } from '@/lib/env';
import { redirect } from 'next/navigation';
import Image from 'next/image';

const ROLE_ROUTES = {
  STUDENT: '/student',
  TEACHER: '/teacher',
  ADMIN: '/admin',
  SYSTEM: '/system',
};

export default async function SigninPage() {
  const session = await getSession();
  if (session) {
    const redirectTo =
      ROLE_ROUTES[session.user.role as keyof typeof ROLE_ROUTES] || '/student';
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/science-advantage.png"
          alt="Science Advantage"
          width={50}
          height={50}
          className="rounded-lg"
        />
        <h1 className="text-3xl font-serif text-primary">Science Advantage</h1>
      </div>

      <SigninContainer isDevAuth={env.DEV_AUTH_ENABLED} />
    </div>
  );
}
