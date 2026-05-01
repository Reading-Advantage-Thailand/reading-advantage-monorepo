"use client";
import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "@/types";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
  Lock,
} from "lucide-react";
import * as Icons from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  hasPermission,
  hasAnyPermission,
  UserForPermissions,
} from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarNavProps {
  items?: SidebarNavItem[];
  user?: UserForPermissions | null | undefined;
}

export function SidebarNav({ items, user }: SidebarNavProps) {
  const path = usePathname();
  // const pathWithoutLocale = "/" + path.split("/").slice(2).join("/");
  const t = useTranslations("Sidebar");
  const tSubItem = useTranslations("Sidebar.subItem");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // console.log("SidebarNav Debug - Current User:", currentUser);

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const isItemActive = (href: string) => {
    // Exact match for the current path
    return path === href;
  };

  const isParentActive = (href: string) => {
    // For parent paths, check if current path starts with the href followed by a slash
    // This prevents false positives like /teacher/my-students matching /teacher/my-students-archive
    return path.startsWith(href + "/");
  };

  const isAnyChildActive = (items: any[]) => {
    return items?.some((child) => child.href && isItemActive(child.href));
  };

  const hasExactChildMatch = (items: any[]) => {
    return items?.some((child) => child.href && path === child.href);
  };

  // Permission checking helpers
  const hasItemPermission = (item: SidebarNavItem | any) => {
    if (!item.requiredPermissions || item.requiredPermissions.length === 0) {
      return true; // No permissions required
    }
    return hasAnyPermission(user, item.requiredPermissions);
  };

  const shouldHideItem = (item: SidebarNavItem | any) => {
    return item.hideWhenNoPermission && !hasItemPermission(item);
  };

  const isItemLocked = (item: SidebarNavItem | any) => {
    return !item.hideWhenNoPermission && !hasItemPermission(item);
  };

  // Filter out hidden items
  const filterItems = (itemsList: any[]) => {
    return itemsList?.filter((item) => !shouldHideItem(item)) || [];
  };

  if (!items?.length) {
    return null;
  }

  // Filter items based on permissions
  const visibleItems = filterItems(items);

  return (
    <TooltipProvider>
      {path.startsWith("/settings") && (
        <button
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500"
          onClick={() => window.history.back()}
        >
          <ChevronLeft width={16} height={16} />
          {t("back")}
        </button>
      )}
      <nav className="mb-4 flex flex-col gap-1 lg:mb-0">
        {visibleItems.map((item: SidebarNavItem, index) => {
          const Icon = item.icon
            ? (Icons[item.icon as keyof typeof Icons] as LucideIcon)
            : null;

          const sectionKey = `${item.title}-${index}`;
          const isLocked = isItemLocked(item);
          const filteredChildItems = filterItems(item.items || []);
          const isOpen =
            openSections[sectionKey] ??
            (isAnyChildActive(filteredChildItems) ||
              (item.href && isParentActive(item.href)));

          // If item has children that are visible after filtering, render as collapsible
          if (filteredChildItems.length > 0) {
            return (
              <Collapsible
                key={index}
                open={isOpen}
                onOpenChange={() => toggleSection(sectionKey)}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "group hover:bg-accent hover:text-accent-foreground flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          // Only highlight parent if no child has exact match AND parent path matches
                          isAnyChildActive(filteredChildItems) ||
                            (!hasExactChildMatch(filteredChildItems) &&
                              item.href &&
                              isItemActive(item.href))
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground",
                          (item.disabled || isLocked) &&
                            "cursor-not-allowed opacity-80",
                          isLocked && "text-muted-foreground/60",
                        )}
                        disabled={item.disabled || isLocked}
                      >
                        <div className="flex items-center">
                          {isLocked ? (
                            <Lock className="mr-2 h-4 w-4" />
                          ) : (
                            Icon && <Icon className="mr-2 h-4 w-4" />
                          )}
                          <span className="truncate capitalize">
                            {t(item.title)}
                          </span>
                        </div>
                        <ChevronRight
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
                      <p>You don't have permission to access this section</p>
                    </TooltipContent>
                  )}
                </Tooltip>
                <CollapsibleContent className="border-border/40 ml-4 space-y-1 border-l py-1 pl-3">
                  {filteredChildItems.map((subItem, subIndex) => {
                    const SubIcon = subItem.icon
                      ? (Icons[
                          subItem.icon as keyof typeof Icons
                        ] as LucideIcon)
                      : null;

                    const isSubItemLocked = isItemLocked(subItem);

                    return (
                      <Tooltip key={subIndex}>
                        <TooltipTrigger asChild>
                          <Link
                            href={
                              subItem.disabled || isSubItemLocked
                                ? "#"
                                : subItem.href
                            }
                            className={cn(
                              "group hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              subItem.href &&
                                isItemActive(subItem.href) &&
                                !isSubItemLocked
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground",
                              (subItem.disabled || isSubItemLocked) &&
                                "cursor-not-allowed opacity-80",
                              isSubItemLocked && "text-muted-foreground/60",
                            )}
                            onClick={(e) => {
                              if (subItem.disabled || isSubItemLocked) {
                                e.preventDefault();
                              }
                            }}
                          >
                            {isSubItemLocked ? (
                              <Lock className="mr-2 h-4 w-4" />
                            ) : (
                              SubIcon && <SubIcon className="mr-2 h-4 w-4" />
                            )}
                            <span className="truncate capitalize">
                              {tSubItem(subItem.title)}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        {isSubItemLocked && (
                          <TooltipContent>
                            <p>You don't have permission to access this page</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // Regular navigation item without children OR parent with all children filtered out but has href
          if (!item.href) {
            return null;
          }

          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Link
                  id={item.id}
                  href={item.disabled || isLocked ? "#" : item.href}
                  className={cn(
                    "group hover:bg-accent hover:text-accent-foreground flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isItemActive(item.href) && !isLocked
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground",
                    (item.disabled || isLocked) &&
                      "cursor-not-allowed opacity-80",
                    isLocked && "text-muted-foreground/60",
                  )}
                  onClick={(e) => {
                    if (item.disabled || isLocked) {
                      e.preventDefault();
                    }
                  }}
                >
                  {isLocked ? (
                    <Lock className="mr-2 h-4 w-4" />
                  ) : (
                    Icon && <Icon className="mr-2 h-4 w-4" />
                  )}
                  <span className="truncate capitalize">{t(item.title)}</span>
                </Link>
              </TooltipTrigger>
              {isLocked && (
                <TooltipContent>
                  <p>You don't have permission to access this page</p>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
