"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import { SidebarTeacherNavItem } from "@/types";
import { useScopedI18n } from "@/locales/client";

interface SidebarTeacherNavProps {
  items: SidebarTeacherNavItem[];
}

export function SidebarTeacherNav({ items }: SidebarTeacherNavProps) {
  const t = useScopedI18n("components.sidebarTeacherNav");
  const path = usePathname();
  const pathWithoutLocale = "/" + path.split("/").slice(2).join("/");
  if (!items?.length) {
    return null;
  }

  return (
    <>
      {pathWithoutLocale.startsWith("/settings") && (
        <button
          className="flex items-center space-x-2 text-sm text-gray-500 py-2 px-4"
          onClick={() => window.history.back()}
        >
          <Icons.back className="h-4 w-4" />
          Back
        </button>
      )}
      <nav className="flex flex-wrap lg:grid items-start gap-2 mb-4 lg:mb-0">
        {items.map((item, index) => {
          const Icon = Icons[item.icon as keyof typeof Icons];
          return (
            item.href && (
              <Link key={index} href={item.disabled ? "/" : item.href}>
                <span
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathWithoutLocale.startsWith(item.href)
                      ? "bg-accent"
                      : "transparent",
                    item.disabled && "cursor-not-allowed opacity-80"
                  )}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span
                    className={cn(
                      "truncate",
                      !pathWithoutLocale.startsWith(item.href) &&
                        "group-hover:block sm:block",
                      pathWithoutLocale.startsWith(item.href)
                        ? "text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {t(
                      item.title as
                        | "dashboard"
                        | "myClasses"
                        | "myStudents"
                        | "classRoster"
                        | "reports"
                        | "assignments"
                        | "passages"
                        | "workbookGenerator"
                    )}
                    {/* {t(item.title)} */}
                  </span>
                </span>
              </Link>
            )
          );
        })}
      </nav>
    </>
  );
}
