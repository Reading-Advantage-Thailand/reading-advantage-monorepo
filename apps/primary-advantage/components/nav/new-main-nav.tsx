"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import * as IconsLucide from "lucide-react";

export function MainNav({
  items,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  items: { href: string; label: string; icon?: string }[];
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("items-center gap-0.5", className)} {...props}>
      {items.map((item) => {
        const Icon = item.icon
          ? (IconsLucide[item.icon as keyof typeof IconsLucide] as LucideIcon)
          : null;
        return (
          <Button key={item.href} variant="ghost" asChild size="sm">
            <Link
              href={item.href}
              className={cn(
                pathname === item.href && "text-primary",
                "font-menu capitalize",
              )}
            >
              {Icon && <Icon className="mr-2 h-4 w-4" />}
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
