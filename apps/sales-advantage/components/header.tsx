"use client";

import { Link } from "@/i18n/navigation";
import { useAuth } from "@reading-advantage/auth-client";
import { Button } from "@reading-advantage/ui";
import { Mic, Shield, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const t = useTranslations("navigation");
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Mic className="h-5 w-5 text-primary" />
            <span>Sales Advantage</span>
          </Link>
          {isAuthenticated && (
            <nav className="hidden gap-4 text-sm md:flex">
              <Link href="/" className="hover:text-primary transition-colors">
                {t("dashboard")}
              </Link>
              {user?.role === "SALES_ADMIN" && (
                <Link href="/admin" className="hover:text-primary transition-colors">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {t("admin")}
                  </span>
                </Link>
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {isAuthenticated ? (
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}