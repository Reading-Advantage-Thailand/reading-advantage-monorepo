"use client";

import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import { Button } from "@reading-advantage/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@reading-advantage/ui";
import { Input } from "@reading-advantage/ui";
import { Label } from "@reading-advantage/ui";
import { BookOpen, MessageCircle, LogOut, User, Shield, Languages } from "lucide-react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "./language-switcher";

/**
 * Renders Codecamp navigation, locale controls, and session actions.
 * @returns Responsive application header content.
 */
export function Header() {
  const t = useTranslations("navigation");
  const tl = useTranslations("login");
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    try {
      await login(username, password);
      setOpen(false);
      setUsername("");
      setPassword("");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Login failed");
    }
  }

  async function handleLogout() {
    await logout();
    window.location.reload();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:h-14 sm:flex-nowrap sm:py-0">
        <div className="flex w-full min-w-0 items-center justify-between gap-4 sm:w-auto sm:justify-start">
          <Link href="/" className="flex min-h-8 shrink-0 items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5" />
            <span>CodeCamp</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="flex min-h-8 shrink-0 items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("dashboard")}
            </Link>
            <Link
              href="/chat"
              className="flex min-h-8 shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              {t("chat")}
            </Link>
            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="flex min-h-8 shrink-0 items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Shield className="h-4 w-4" />
                {t("admin")}
              </Link>
            )}
          </nav>
        </div>

        <div className="flex w-full min-w-0 items-center justify-end gap-3 sm:w-auto">
          <div className="flex items-center gap-1 border-r pr-3">
            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
            <LanguageSwitcher />
          </div>
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{user.name ?? user.username}</span>
                <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                  {user.role}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" />
                {tl("logout")}
              </Button>
            </div>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  {tl("login")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{tl("loginTitle")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{tl("username")}</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="intern1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{tl("password")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  {loginError && (
                    <p className="text-sm text-destructive">{loginError}</p>
                  )}
                  <Button type="submit" className="w-full">
                    {tl("login")}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
}
