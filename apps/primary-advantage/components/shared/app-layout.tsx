import { UserAccountNav } from "@/components/nav/user-account-nav";
import { AppBrand, AppSidebar, BottomNav, MobileMenu } from "@/components/nav/app-nav";
import { ThemeToggle } from "@/components/switchers/theme-switcher-toggle";
import { SoundToggle } from "@/components/switchers/sound-toggle";
import { SoundProvider } from "@/hooks/use-sound";
import { LocaleSwitcher } from "@/components/switchers/locale-switcher";
import { SkipLink } from "@/components/shared/skip-link";
import { getCurrentUser } from "@/lib/session";
import { withSchoolAdminRows } from "@/server/utils/school-admin-rows";
import { redirect } from "@/i18n/navigation";
import { areaForRole, type NavArea } from "@/lib/nav-area";
import { getLocale } from "next-intl/server";
import { Signpost, Toolbar } from "@/components/rpg/toolbar";
import { StudentHud } from "@/components/rpg/hud";
import { OfflineSign } from "@/components/pwa/offline-sign";

interface AppLayoutProps {
  children?: React.ReactNode;
  /** The nav area. When omitted (shared pages such as settings) it follows the user role. */
  area?: NavArea;
  /** True on settings pages: staff also get the settings links in the menu. */
  settings?: boolean;
}

/** Props of the area layouts that wrap AppLayout. */
export interface BaseAppLayoutProps {
  children?: React.ReactNode;
}

/**
 * Renders the signed-in shell: the header, one role navigation (sidebar from 1024 px,
 * bottom bar below), and the page content. Signed-out visitors go to the sign-in page.
 * @param props The page content, the nav area, and the settings flag.
 * @returns The shell.
 */
export default async function AppLayout({
  children,
  area,
  settings = false,
}: AppLayoutProps) {
  const sessionUser = await getCurrentUser();
  const locale = await getLocale();

  // Redirect to sign in page if user is not logged in
  if (!sessionUser) {
    return redirect({ href: "/auth/signin", locale });
  }

  // A TEACHER with a school_admins row sees the school links too (the session has no row list).
  const user = await withSchoolAdminRows(sessionUser);

  const navArea = area ?? areaForRole(user.role);

  // The student shell is the Chibi Quest world (docs/primary-rpg-skin.md): a wooden header with
  // the HUD, the signpost on desktop, the toolbar on phones, and the page's own scene behind.
  if (navArea === "student") {
    return (
      <SoundProvider userId={user.id}>
        <div className="cq-world flex min-h-screen flex-col">
          <SkipLink />
          <header className="cq-header sticky top-0 z-40">
            <div className="container flex h-16 items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <MobileMenu area={navArea} user={user} settings={settings} />
                <div className="max-sm:[&_span]:hidden">
                  <AppBrand area={navArea} />
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <StudentHud user={user} />
                <LocaleSwitcher />
                <SoundToggle />
                <ThemeToggle />
                <UserAccountNav user={user} />
              </div>
            </div>
          </header>
          <OfflineSign />
          <div className="container flex flex-1 gap-8 pt-5">
            <div className="relative z-10 hidden lg:block lg:w-[230px] lg:shrink-0">
              <div className="sticky top-22">
                <Signpost user={user} />
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-6 pb-[calc(var(--bottom-nav-h)+2rem)] lg:pb-8">
              <main id="main-content" tabIndex={-1} className="flex w-full min-w-0 flex-1 flex-col outline-none">
                {children}
              </main>
            </div>
          </div>
          <Toolbar user={user} />
        </div>
      </SoundProvider>
    );
  }

  // The staff shell: the wooden header and the signpost menu of the student shell, on a parchment
  // ground (owner look check 2026-10-14, option B).
  return (
    <SoundProvider userId={user.id}>
    <div className="cq-staff flex min-h-screen flex-col">
      <SkipLink />
      <header className="cq-header sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <MobileMenu area={navArea} user={user} settings={settings} />
            <AppBrand area={navArea} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <LocaleSwitcher />
            <SoundToggle />
            <ThemeToggle />
            <UserAccountNav user={user} />
          </div>
        </div>
      </header>
      <OfflineSign />
      <div className="container flex flex-1 gap-8 pt-6">
        <div className="hidden lg:block lg:w-[230px] lg:shrink-0">
          <div className="sticky top-22">
            <AppSidebar area={navArea} user={user} settings={settings} />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-6 pb-[calc(var(--bottom-nav-h)+2rem)] lg:pb-8">
          {/* No overflow-hidden: wide tables scroll inside their own container. */}
          <main id="main-content" tabIndex={-1} className="flex w-full min-w-0 flex-1 flex-col outline-none">
            {children}
          </main>
        </div>
      </div>
      <BottomNav area={navArea} user={user} />
    </div>
    </SoundProvider>
  );
}
