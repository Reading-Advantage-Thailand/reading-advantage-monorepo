import { requireRole } from '@/lib/auth/server';
import { UserMenu } from '@/components/features/auth/user-menu';
import { AdminNav } from '@/components/features/admin/admin-nav';
import Image from 'next/image';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole('ADMIN');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="flex items-center gap-3">
                <Image
                  src="/science-advantage.png"
                  alt="Science Advantage"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
                <span className="font-bold text-xl text-rose-800">
                  Science Advantage
                </span>
              </Link>
              <AdminNav />
            </div>
            <UserMenu user={session.user} />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
