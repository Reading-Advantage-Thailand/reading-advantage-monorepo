import { MainNav } from "@/components/nav/main-nav";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { settingsPageConfig } from "@/configs/settings-page-config";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function NotfoundPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav items={settingsPageConfig.mainNav} />
          <div className="flex justify-center items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <UserAccountNav user={{ ...user, xp: 0, level: 0, cefrLevel: "", email: null, image: null }} />
          </div>
        </div>
      </header>
      <div className="container grid">
        <main className="flex w-full flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
