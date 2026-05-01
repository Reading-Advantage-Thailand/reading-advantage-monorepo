"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NavItem } from "@/config/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Image from "next/image";
import { useScopedI18n } from "@/locales/client";
import { LocaleSwitcher } from "@/switcher/locale-switcher";

export function Header() {
  const h = useScopedI18n("components.common.header");
  const n = useScopedI18n("components.common.navigation");

  const navigation: NavItem[] = [
    {
      title: n("home"),
      href: "/",
    },
    {
      title: n("products"),
      href: "/products",
    },
    {
      title: n("services"),
      href: "/services",
    },
    {
      title: n("features"),
      href: "/features",
    },
    {
      title: n("pricing"),
      href: "/pricing",
    },
    {
      title: n("caseStudies"),
      href: "/case-studies",
    },
    {
      title: n("blog"),
      href: "/blog",
    },
    {
      title: n("about"),
      href: "/about",
    },
    {
      title: n("contact"),
      href: "/contact",
    },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const renderMarketingCTA = (isMobile = false) => {
    return (
      <div
        className={
          isMobile
            ? "border-t border-sky-100 pt-4 mt-4"
            : "hidden lg:flex items-center space-x-4"
        }
      >
        <Button variant="default" asChild>
          <Link href="/contact">{h("contactUs")}</Link>
        </Button>
      </div>
    );
  };

  return (
    <header className="bg-sky-50/90 backdrop-blur-md border-b border-sky-100 fixed w-full top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20">
          {/* Mobile menu button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-6 w-6" />
                <span className="sr-only">{h("openMenu")}</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-sky-50 border-r border-sky-100"
            >
              <SheetHeader>
                <SheetTitle className="text-black ">
                  {h("navigationMenu")}
                </SheetTitle>
                <SheetDescription className="text-warm-charcoal">
                  {h("navigationDescription")}
                </SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-8">
                {navigation.map((link) => {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-lg px-3 py-2 rounded-lg hover:bg-sky-100 transition-colors  font-medium ${
                        pathname === link.href ? "bg-oat-light" : ""
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {link.title}
                    </Link>
                  );
                })}
                {renderMarketingCTA(true)}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo.jpg"
                alt="Reading Advantage Thailand Logo"
                width={48}
                height={48}
                className="h-12 w-auto rounded-md"
                priority
              />
            </Link>
          </div>

          {/* Main Navigation */}
          <nav className="hidden lg:flex space-x-8">
            {navigation.map((link) => {
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-slate-700 hover:text-black transition-colors relative py-2  font-medium text-[15px] ${
                    pathname === link.href ? "font-semibold" : ""
                  }`}
                >
                  {link.title}
                  {pathname === link.href && (
                    <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-sky-400 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-6">
            {/* Language Selector */}
            <LocaleSwitcher />

            {/* Marketing CTA */}
            {renderMarketingCTA()}
          </div>
        </div>
      </div>
    </header>
  );
}
