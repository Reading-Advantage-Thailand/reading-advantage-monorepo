"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { hasAnyPermission, type UserForPermissions } from "@/lib/permissions";
import { activeKey } from "@/lib/nav-area";
import { ART } from "@/lib/rpg/places";
import { studentPageConfig } from "@/configs/student-page-config";

/** The Forge icon of each student tab and menu item. */
export const NAV_ART: Record<string, string> = {
  home: ART.banner,
  read: ART.scroll,
  games: ART.sharpBlade,
  me: ART.chest,
  assignments: ART.noticeBoard,
  sentences: ART.scroll,
  vocabulary: ART.gem,
  reports: ART.gem,
  history: ART.campfire,
};

/**
 * The wooden toolbar of the student shell (phones; hidden from 1024 px): the four tabs with
 * Forge icons. The active tab gets aria-current="page".
 * @param props.user The signed-in student, for permission checks.
 * @returns The toolbar.
 */
export function Toolbar({ user }: { user?: UserForPermissions | null }) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();
  const tabs = (studentPageConfig.tabs ?? []).filter((tab) => !tab.requiredPermissions?.length || hasAnyPermission(user, tab.requiredPermissions));
  const current = activeKey(
    tabs.map((tab) => ({ key: tab.key, prefixes: [tab.href, ...(tab.match ?? [])] })),
    pathname,
  );
  return (
    <nav aria-label={t("mainNavigation")} data-bottom-nav="" className="cq-toolbar fixed inset-x-0 bottom-0 z-40 h-(--bottom-nav-h) pb-(--safe-bottom) lg:hidden">
      <ul className="mx-auto grid h-full max-w-lg auto-cols-fr grid-flow-col">
        {tabs.map((tab) => (
          <li key={tab.key} className="h-full">
            <Link href={tab.href} aria-current={tab.key === current ? "page" : undefined} className="flex h-full flex-col items-center justify-center gap-0.5 px-1 py-1">
              <img src={NAV_ART[tab.key] ?? ART.scroll} alt="" />
              <span className="max-w-full truncate">{t(`tabs.${tab.key}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The signpost of the student shell (desktop): every menu item as a plank on a post.
 * @param props.user The signed-in student, for permission checks.
 * @returns The signpost navigation.
 */
export function Signpost({ user }: { user?: UserForPermissions | null }) {
  const t = useTranslations("Sidebar");
  const tShell = useTranslations("AppShell");
  const pathname = usePathname();
  const items = (studentPageConfig.sidebarNav ?? []).filter((item) => item.href && (!item.requiredPermissions?.length || hasAnyPermission(user, item.requiredPermissions)));
  const current = activeKey(
    items.map((item) => ({ key: item.title, prefixes: [item.href as string] })),
    pathname,
  );
  return (
    <nav aria-label={tShell("mainNavigation")} className="cq-signpost">
      {items.map((item) => (
        <Link key={item.title} href={item.href as string} aria-current={item.title === current ? "page" : undefined}>
          <img src={NAV_ART[item.title] ?? ART.scroll} alt="" />
          {t(item.title)}
        </Link>
      ))}
    </nav>
  );
}
