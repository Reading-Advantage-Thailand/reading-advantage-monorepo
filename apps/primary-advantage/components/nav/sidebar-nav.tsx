"use client";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NavLink, SidebarNavItem } from "@/types";
import { ChevronRight, LucideIcon, Lock } from "lucide-react";
import * as Icons from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { hasAnyPermission, UserForPermissions } from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { activeKey, type ActiveCandidate } from "@/lib/nav-area";

interface SidebarNavProps {
  items?: SidebarNavItem[];
  user?: UserForPermissions | null | undefined;
  /** Accessible name of the nav landmark. */
  label?: string;
}

type AnyNavItem = SidebarNavItem | NavLink;

/**
 * Looks up a lucide icon by name.
 * @param name The lucide-react export name.
 * @returns The icon component, or null.
 */
function iconFor(name?: string): LucideIcon | null {
  return name ? ((Icons[name as keyof typeof Icons] as LucideIcon) ?? null) : null;
}

/**
 * Renders the role menu as a vertical list with collapsible groups. Items without
 * permission are hidden or shown locked. The one active link gets aria-current="page".
 * @param props The menu items, the user for permission checks, and the landmark label.
 * @returns The menu, or null when there are no items.
 */
export function SidebarNav({ items, user, label }: SidebarNavProps) {
  const path = usePathname();
  const t = useTranslations("Sidebar");
  const tSubItem = useTranslations("Sidebar.subItem");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const hasItemPermission = (item: AnyNavItem) =>
    !item.requiredPermissions?.length || hasAnyPermission(user, item.requiredPermissions);
  const shouldHideItem = (item: AnyNavItem) => item.hideWhenNoPermission && !hasItemPermission(item);
  const isItemLocked = (item: AnyNavItem) => !item.hideWhenNoPermission && !hasItemPermission(item);
  const filterItems = <T extends AnyNavItem>(list: T[] = []) => list.filter((item) => !shouldHideItem(item));

  if (!items?.length) {
    return null;
  }

  const visibleItems = filterItems(items);

  // One active link for the whole menu: the longest matching href (ties go to the later item).
  const candidates: ActiveCandidate[] = [];
  visibleItems.forEach((item, index) => {
    const children = filterItems(item.items ?? []);
    if (children.length > 0) {
      children.forEach((child, subIndex) => {
        if (child.href && !isItemLocked(child)) candidates.push({ key: `${index}.${subIndex}`, prefixes: [child.href] });
      });
    } else if (item.href && !isItemLocked(item)) {
      candidates.push({ key: `${index}`, prefixes: [item.href] });
    }
  });
  const activeId = activeKey(candidates, path);

  const linkClass = (active: boolean, locked: boolean, disabled?: boolean) =>
    cn(
      "group hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground",
      (disabled || locked) && "cursor-not-allowed opacity-80",
    );

  return (
    <TooltipProvider>
      <nav aria-label={label} className="flex flex-col gap-1">
        {visibleItems.map((item, index) => {
          const Icon = iconFor(item.icon);
          const sectionKey = `${item.title}-${index}`;
          const isLocked = isItemLocked(item);
          const childItems = filterItems(item.items ?? []);
          const childActive = activeId?.startsWith(`${index}.`) ?? false;

          if (childItems.length > 0) {
            const isOpen =
              openSections[sectionKey] ??
              (childActive || Boolean(item.href && path.startsWith(item.href + "/")));
            return (
              <Collapsible key={index} open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          linkClass(childActive, isLocked, item.disabled),
                          "w-full justify-between",
                        )}
                        disabled={item.disabled || isLocked}
                      >
                        <span className="flex items-center">
                          {isLocked ? (
                            <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                          ) : (
                            Icon && <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                          )}
                          <span className="truncate capitalize">{t(item.title)}</span>
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isOpen && "rotate-90",
                            isLocked && "opacity-50",
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </TooltipTrigger>
                  {isLocked && (
                    <TooltipContent>
                      <p>{t("noPermissionSection")}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <CollapsibleContent className="border-border/40 ml-4 space-y-1 border-l py-1 pl-3">
                  {childItems.map((subItem, subIndex) => {
                    const SubIcon = iconFor(subItem.icon);
                    const isSubItemLocked = isItemLocked(subItem);
                    const active = activeId === `${index}.${subIndex}`;
                    return (
                      <Tooltip key={subIndex}>
                        <TooltipTrigger asChild>
                          <Link
                            href={subItem.disabled || isSubItemLocked ? "#" : subItem.href}
                            aria-current={active ? "page" : undefined}
                            className={linkClass(active, isSubItemLocked, subItem.disabled)}
                            onClick={(e) => {
                              if (subItem.disabled || isSubItemLocked) e.preventDefault();
                            }}
                          >
                            {isSubItemLocked ? (
                              <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                            ) : (
                              SubIcon && <SubIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                            )}
                            <span className="truncate capitalize">{tSubItem(subItem.title)}</span>
                          </Link>
                        </TooltipTrigger>
                        {isSubItemLocked && (
                          <TooltipContent>
                            <p>{t("noPermissionPage")}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          if (!item.href) {
            return null;
          }

          const active = activeId === `${index}`;
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Link
                  id={item.id}
                  href={item.disabled || isLocked ? "#" : item.href}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active, isLocked, item.disabled)}
                  onClick={(e) => {
                    if (item.disabled || isLocked) e.preventDefault();
                  }}
                >
                  {isLocked ? (
                    <Lock className="mr-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    Icon && <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="truncate capitalize">{t(item.title)}</span>
                </Link>
              </TooltipTrigger>
              {isLocked && (
                <TooltipContent>
                  <p>{t("noPermissionPage")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
