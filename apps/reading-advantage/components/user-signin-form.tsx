"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/locales/client";
import { useTrpcAuth } from "@/lib/use-trpc-auth";
import { signIn } from "next-auth/react";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserSignInForm({ className, ...props }: UserAuthFormProps) {
  const t = useI18n();
  const { login, migrate, isLoading, error: authError } = useTrpcAuth();
  const [error, setError] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showMigration, setShowMigration] = React.useState(false);
  const [migrationPassword, setMigrationPassword] = React.useState("");

  const displayError = authError || error;

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError("");
    const user = await login(email, password);
    if (user) {
      // Also establish NextAuth session for server-rendered pages
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      window.location.href = "/";
    } else if (authError === "MIGRATION_REQUIRED") {
      setShowMigration(true);
    }
  }

  async function onMigrate(event: React.SyntheticEvent) {
    event.preventDefault();
    setError("");
    const user = await migrate(email, migrationPassword);
    if (user) {
      await signIn("credentials", {
        email,
        password: migrationPassword,
        redirect: false,
      });
      window.location.href = "/";
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              placeholder={t('pages.signInForm.emailPlaceholder')}
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              placeholder={t('pages.signInForm.passwordPlaceholder')}
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          {displayError && displayError !== "MIGRATION_REQUIRED" && (
            <div className="text-red-500 text-sm">{displayError}</div>
          )}
          <Button
            name="signin-button"
            type="submit"
            role="button"
            disabled={isLoading}
          >
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t('pages.signInForm.signIn')}
          </Button>
          <Link
            href="/auth/forgot-password"
            className="text-sm text-muted-foreground hover:text-blue-500"
          >
            {t('pages.signInForm.forgotPassword')}
          </Link>
        </div>
      </form>

      <Dialog open={showMigration} onOpenChange={setShowMigration}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Your Password</DialogTitle>
            <DialogDescription>
              Your account needs a new password for the updated login system.
              Please create a password below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onMigrate} className="grid gap-4">
            <div className="grid gap-1">
              <Label htmlFor="migration-password">New Password</Label>
              <Input
                id="migration-password"
                type="password"
                placeholder="Enter a new password"
                value={migrationPassword}
                onChange={(e) => setMigrationPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>
            {authError && authError !== "MIGRATION_REQUIRED" && (
              <div className="text-red-500 text-sm">{authError}</div>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              Set Password & Continue
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-2 text-muted-foreground">{t('pages.signInForm.orContinueWith')}</span>
        </div>
      </div>
      <Button
        name="google-button"
        variant="outline"
        type="button"
        disabled={isLoading}
        role="button"
        onClick={() => signIn("google")}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2 h-4 w-4" />
        )}{" "}
        {t('pages.signInForm.google')}
      </Button>
    </div>
  );
}
