"use client";

import { Link } from "@/i18n/navigation";
import React from "react";
import { MainNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { useSelectedLayoutSegment } from "next/navigation";
import { Icons } from "../icons";
import { MobileNav } from "./mobile-nav";
import * as IconsLucide from "lucide-react";
import { LucideIcon, MenuIcon, X } from "lucide-react";
import { siteConfig } from "@/configs/site-config";
import { useTranslations } from "next-intl";

interface MainNavProps {
  children?: React.ReactNode;
  items?: MainNavItem[];
}

export function MainNav({ children, items }: MainNavProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("MainNav");

  return (
    <div className="flex gap-6 md:gap-10">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <Icons.logo />
        <span className="font-logo hidden font-bold text-[#22d3ee] sm:inline-block md:text-xs lg:text-lg">
          {siteConfig.name}
        </span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-4 md:flex">
          {items?.map((item, index) => {
            const Icon = item.icon
              ? (IconsLucide[
                  item.icon as keyof typeof IconsLucide
                ] as LucideIcon)
              : null;

            return (
              <Link
                key={index}
                href={item.disabled ? "#" : item.href}
                className={cn(
                  "font-menu hover:text-foreground/80 flex items-center font-medium capitalize transition-colors md:text-xs lg:text-lg",
                  item.href.startsWith(`/${segment}`)
                    ? "text-foreground"
                    : "text-foreground/60",
                  item.disabled && "cursor-not-allowed opacity-80",
                )}
              >
                {Icon && <Icon className="mr-2 h-4 w-4" />}
                {t(item.title)}
              </Link>
            );
          })}
        </nav>
      ) : null}
      <button
        className="flex items-center space-x-2 md:hidden"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <X className="text-cyan-500" /> : <Icons.logo />}
        <MenuIcon className="h-4 w-4 text-cyan-500" />
      </button>
      {showMobileMenu && items && (
        <MobileNav items={items}>{children}</MobileNav>
      )}
    </div>
  );
}
