import { PublicHeader } from "@/components/nav/public-header";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { getCurrentUser } from "@/lib/session";

/**
 * Renders the 404 shell for signed-in and anonymous visitors alike.
 * @param children The not-found page content.
 * @returns The not-found layout.
 */
export default async function NotfoundPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <PublicHeader>
        <LocaleSwitcher />
        <ThemeToggle />
        {user ? <UserAccountNav user={user} /> : null}
      </PublicHeader>
      <div className="container grid">
        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
