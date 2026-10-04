"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import * as Icons from "lucide-react";
import { MenuIcon, type LucideIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { hasAnyPermission, type UserForPermissions } from "@/lib/permissions";
import { activeKey, type NavArea } from "@/lib/nav-area";
import { areaConfigs } from "@/configs/app-nav";
import { settingsPageConfig } from "@/configs/settings-page-config";
import type { SidebarNavItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

/** Props shared by the app navigation parts. */
export interface AppNavProps {
  /** The signed-in area whose items to show (null: no area items). */
  area: NavArea | null;
  /** The signed-in user, for permission checks. */
  user?: UserForPermissions | null;
  /** True on settings pages: staff also get the settings links. */
  settings?: boolean;
}

/**
 * Builds the full menu list for an area, plus the settings links for staff on settings pages.
 * @param area The nav area.
 * @param settings Whether the page is a settings page.
 * @returns The sidebar items.
 */
function menuItems(area: NavArea | null, settings?: boolean): SidebarNavItem[] {
  const items = area ? (areaConfigs[area].sidebarNav ?? []) : [];
  return settings && area !== "student" ? [...items, ...(settingsPageConfig.sidebarNav ?? [])] : items;
}

/**
 * Renders the large-screen sidebar menu for an area.
 * @param props The area, the user, and the settings flag.
 * @returns The sidebar navigation.
 */
export function AppSidebar({ area, user, settings }: AppNavProps) {
  const t = useTranslations("AppShell");
  return <SidebarNav items={menuItems(area, settings)} user={user} label={t("mainNavigation")} />;
}

/**
 * Renders the mobile bottom bar: up to four glass tabs, hidden from 1024 px up. The active
 * tab gets aria-current="page"; the bar clears the device safe area.
 * @param props The area and the user.
 * @returns The bottom navigation, or null when the area has no tabs.
 */
export function BottomNav({ area, user }: AppNavProps) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();
  const tabs = (area ? (areaConfigs[area].tabs ?? []) : []).filter(
    (tab) => !tab.requiredPermissions?.length || hasAnyPermission(user, tab.requiredPermissions),
  );
  if (!tabs.length) return null;
  const current = activeKey(
    tabs.map((tab) => ({ key: tab.key, prefixes: [tab.href, ...(tab.match ?? [])] })),
    pathname,
  );

  return (
    <nav
      aria-label={t("mainNavigation")}
      className="glass fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col">
        {tabs.map((tab) => {
          const Icon = Icons[tab.icon as keyof typeof Icons] as LucideIcon | undefined;
          const active = tab.key === current;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full",
                    active && "bg-[var(--nav-active-bg)]",
                  )}
                >
                  {Icon && <Icon className="size-5" aria-hidden="true" />}
                </span>
                <span className="max-w-full truncate">{t(`tabs.${tab.key}`)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Renders the menu button for screens below 1024 px. It opens the full area menu in a
 * side sheet, so pages that are not bottom-bar tabs stay reachable on phones.
 * @param props The area, the user, and the settings flag.
 * @returns The menu button and sheet, or null when the area has no menu items.
 */
export function MobileMenu({ area, user, settings }: AppNavProps) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();
  // The sheet stays open only on the page where it opened, so a link click closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const items = menuItems(area, settings);
  if (!items.length) return null;

  return (
    <Sheet open={openOn === pathname} onOpenChange={(open) => setOpenOn(open ? pathname : null)}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("openMenu")}>
          <MenuIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("menu")}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          <SidebarNav items={items} user={user} label={t("menu")} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Renders the brand link to the home tab of the area.
 * @param props The area.
 * @returns The brand link.
 */
export function AppBrand({ area }: Pick<AppNavProps, "area">) {
  return <Brand href={area ? (areaConfigs[area].tabs?.[0]?.href ?? "/") : "/"} />;
}
