"use client";
import Link from "next/link";
import React from "react";
import { MainNavItem } from "@/types";
import { cn } from "@/lib/utils";
import { useSelectedLayoutSegment } from "next/navigation";
import { MobileNav } from "./mobile-navbar";
import { Icons } from "./icons";
import { siteConfig } from "@/configs/site-config";
import { useScopedI18n } from "@/locales/client";

interface MainNavProps {
  children?: React.ReactNode;
  items?: MainNavItem[];
}

export function MainNav({ children, items }: MainNavProps) {
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const segment = useSelectedLayoutSegment();
  const t = useScopedI18n("components.mainNav");
  const menuT = useScopedI18n("components");
  return (
    <div className="flex md:gap-10 gap-6 relative z-50">
      <Link href="/" className="hidden items-center space-x-2 md:flex">
        <Icons.logo />
        <span className="hidden text-[#3b82f6] font-heading font-bold sm:inline-block">
          {siteConfig.name}
        </span>
      </Link>
      {items?.length ? (
        <nav className="hidden gap-6 md:flex">
          {items?.map((item, index) => (
            <Link
              key={index}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center text-lg font-medium transition-colors hover:text-foreground/80 sm:text-sm",
                item.href.startsWith(`/${segment}`)
                  ? "text-foreground"
                  : "text-foreground/60",
                item.disabled && "cursor-not-allowed opacity-80",
              )}
            >
              {t(item.title)}
            </Link>
          ))}
        </nav>
      ) : null}
      <button
        className="flex items-center space-x-2 md:hidden"
        onClick={() => setShowMobileMenu(!showMobileMenu)}
      >
        {showMobileMenu ? <Icons.close color="#3b82f6" /> : <Icons.logo />}
        <span className="font-bold text-[#3b82f6]">{menuT("menu")}</span>
      </button>
      {showMobileMenu && items && (
        <MobileNav items={items}>{children}</MobileNav>
      )}
    </div>
  );
}
