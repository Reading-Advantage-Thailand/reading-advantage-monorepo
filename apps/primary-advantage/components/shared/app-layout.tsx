import { MainNav } from "@/components/nav/main-nav";
import { UserAccountNav } from "@/components/nav/user-account-nav";
import { SidebarNav } from "@/components/nav/sidebar-nav";
import ProgressBar from "@/components/progress-bar-xp";
import { MainNavItem, SidebarNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import Leaderboard from "../leaderboard";
import { getLocale } from "next-intl/server";
import { Role } from "@/types/enum";
import { getSchoolLeaderboardController } from "@/server/controllers/schoolController";

interface AppLayoutProps {
  children?: React.ReactNode;
  mainNavConfig: MainNavItem[];
  sidebarNavConfig?: SidebarNavItem[];
  disableProgressBar?: boolean;
  disableSidebar?: boolean;
  disableLeaderboard?: boolean;
}

export interface BaseAppLayoutProps {
  children?: React.ReactNode;
}

export default async function AppLayout({
  children,
  mainNavConfig,
  sidebarNavConfig,
  disableProgressBar,
  disableSidebar = false,
  disableLeaderboard = false,
}: AppLayoutProps) {
  const user = await getCurrentUser();
  const locale = await getLocale();

  // Redirect to sign in page if user is not logged in
  if (!user) {
    return redirect({ href: "/auth/signin", locale });
  }

  let leaderboardData: any | null = null;

  if (user.role === Role.student) {
    const leaderboard = await getSchoolLeaderboardController(
      user.schoolId,
      user.id,
    );
    if (leaderboard?.success) {
      leaderboardData = leaderboard?.data;
    }
  }

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="bg-background sticky top-0 z-40 border-b">
        <div className="container flex h-16 items-center justify-between">
          <MainNav items={mainNavConfig} />
          <div className="flex items-center justify-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
            <UserAccountNav user={user} />
          </div>
        </div>
      </header>
      <div
        className={cn(
          "container",
          disableSidebar
            ? "flex flex-1 gap-12"
            : "flexl-1 flex flex-col gap-4 lg:flex-row",
        )}
      >
        {!disableSidebar && (
          <aside className="lg:flex lg:w-[230px] lg:flex-col">
            <SidebarNav items={sidebarNavConfig || []} user={user} />
            {!disableLeaderboard && user.role === Role.student ? (
              <Leaderboard
                data={leaderboardData?.results || []}
                schoolName={leaderboardData?.schoolName || ""}
                userId={user.id}
              />
            ) : null}
          </aside>
        )}
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
