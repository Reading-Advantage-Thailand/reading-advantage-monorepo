import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { MainNav } from "@/components/main-navbar";
import { UserAccountNav } from "@/components/user-account-nav";
import { SidebarNav } from "@/components/sidebar-nav";
import ProgressBar from "@/components/progress-bar-xp";
import { NavItem, SidebarNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/components/switchers/theme-switcher-toggle";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import Leaderboard from "@/components/teacher/leaderboard";
import { SidebarGoalsWidget } from "@/components/shared/sidebar-goals-widget";
import { headers } from "next/headers";
import { ThemeCustomizer } from "../theme-customizer";

interface AppLayoutProps {
  children?: React.ReactNode;
  mainNavConfig: NavItem[];
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
  disableSidebar,
  disableLeaderboard,
}: AppLayoutProps) {
  const user = await getCurrentUser();

  // Redirect to sign in page if user is not logged in
  if (!user) {
    return redirect("/auth/signin");
  }

  const feactlearderboard = async () => {
    if (!user.license_id) return [];

    try {
      const headersList = await headers();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/ranking/${user.license_id}`,
        {
          method: "GET",
          headers: headersList,
          cache: "no-store",
        },
      );

      if (!res.ok) {
        console.error(
          "Failed to fetch LeaderBoard:",
          res.status,
          res.statusText,
        );
        return [];
      }

      const fetchdata = await res.json();
      return fetchdata.results || [];
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
  };

  const leaderboard = await feactlearderboard();

  // Redirect to level selection page if user has not selected a level
  // if (user.level === undefined || user.cefr_level === "") {
  //   return redirect("/level");
  // }

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <header className="sticky top-0 z-[100] border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <MainNav items={mainNavConfig} />
          {!disableProgressBar && (
            <ProgressBar progress={user.xp} level={user.level!} />
          )}
          <div className="flex space-x-2">
            <LocaleSwitcher />
            <ThemeCustomizer />
            <ThemeSwitcher />
            <UserAccountNav user={user} />
          </div>
        </div>
      </header>
      <div
        className={cn(
          "container",
          disableSidebar
            ? "grid flex-1 gap-12"
            : "mx-auto px-4 lg:grid lg:flex-1 gap-12 lg:grid-cols-[200px_1fr]",
        )}
      >
        {!disableSidebar && (
          <aside className="lg:w-[230px] lg:flex-col lg:flex">
            <SidebarNav items={sidebarNavConfig || []} />
            {user.license_id && !disableLeaderboard ? (
              <Leaderboard data={leaderboard} />
            ) : null}
            {user.role === "STUDENT" && <SidebarGoalsWidget userId={user.id} />}
          </aside>
        )}
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
