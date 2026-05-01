"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import axios from "axios";
import { useI18n } from "@/locales/client";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserSignInForm({ className, ...props }: UserAuthFormProps) {
  const t = useI18n();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [email, setEmail] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [showMigrationModal, setShowMigrationModal] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState<string>("");
  const [migrationLoading, setMigrationLoading] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string>("");

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setPasswordError(t('pages.signInForm.passwordMinLength'));
      return false;
    }
    if (!/[a-zA-Z]/.test(password)) {
      setPasswordError(t('pages.signInForm.passwordMustContainLetter'));
      return false;
    }
    if (!/\d/.test(password)) {
      setPasswordError(t('pages.signInForm.passwordMustContainNumber'));
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleModalClose = (open: boolean) => {
    setShowMigrationModal(open);
    if (!open && firebaseAuth.currentUser) {
      firebaseAuth.signOut();
    }
  };

  async function checkPasswordSet() {
    try {
      const res = await axios.post("/api/auth/check-password-set", { email });
      if (!res.data.hasPassword) {
        setShowMigrationModal(true);
      } else {
        setError(t('pages.signInForm.invalidEmailOrPassword'));
      }
    } catch (err) {
      setError(t('pages.signInForm.invalidEmailOrPassword'));
    }
  }

  async function handleMigration() {
    if (!validatePassword(newPassword)) {
      return;
    }
    setMigrationLoading(true);
    try {
      const user = firebaseAuth.currentUser;
      if (user) {
        const idToken = await user.getIdToken();
        await axios.post("/api/auth/update-password", { idToken, newPassword });
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password: newPassword,
        });
        if (res?.ok) {
          window.location.href = res.url || "/";
        } else {
          setError(t('pages.signInForm.failedToSignInAfterMigration'));
        }
      } else {
        setError(t('pages.signInForm.migrationFailed'));
      }
    } catch (error) {
      setError(t('pages.signInForm.migrationFailed'));
    } finally {
      setMigrationLoading(false);
      setShowMigrationModal(false);
    }
  }

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const checkRes = await axios.post("/api/auth/check-password-set", { email });
      if (checkRes.data.hasPassword) {
        const res = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });
        if (res?.ok) {
          window.location.href = res.url || "/";
        } else {
          setError(t('pages.signInForm.invalidEmailOrPassword'));
        }
      } else {
        try {
          await signInWithEmailAndPassword(firebaseAuth, email, password);
          setShowMigrationModal(true);
        } catch (error) {
          setError(t('pages.signInForm.invalidEmailOrPassword'));
        }
      }
    } catch (err) {
      setError(t('pages.signInForm.invalidEmailOrPassword'));
    } finally {
      setIsLoading(false);
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
            <Label className="sr-only" htmlFor="email">
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
          {error && <div className="text-red-500 text-sm">{error}</div>}
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
      <Dialog open={showMigrationModal} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="space-y-4">
            <DialogTitle className="flex items-center gap-3 m-3 p-3 border-2 border-orange-600 border-dashed rounded-lg shadow-sm">
              <div className="flex-shrink-0">
                <Icons.warning className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-lg font-semibold text-amber-900">
                {t('pages.signInForm.databaseMigrationRequired')}
              </span>
            </DialogTitle>
            <DialogDescription className="flex items-start m-3 gap-2 text-gray-700 leading-relaxed">
              <Icons.info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span>
                {t('pages.signInForm.migrationDescription')}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label
                htmlFor="newPassword"
                className="flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Icons.lock className="h-4 w-4 text-gray-500" />
                {t('pages.signInForm.newPassword')}
              </Label>
              <Input
                id="newPassword"
                type="password"
                placeholder={t('pages.signInForm.newPasswordPlaceholder')}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                disabled={migrationLoading}
                className={`transition-colors focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                  passwordError
                    ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                    : ""
                }`}
              />
              {passwordError && (
                <div className="text-red-500 text-sm flex items-center gap-1">
                  <Icons.warning className="h-3 w-3" />
                  {passwordError}
                </div>
              )}
              <div className="text-xs text-gray-500 space-y-1">
                <div
                  className={`flex items-center gap-1 ${newPassword.length >= 8 ? "text-green-600" : "text-gray-400"}`}
                >
                  <Icons.check className="h-3 w-3" />
                  {t('pages.signInForm.atLeast8Chars')}
                </div>
                <div
                  className={`flex items-center gap-1 ${/[a-zA-Z]/.test(newPassword) ? "text-green-600" : "text-gray-400"}`}
                >
                  <Icons.check className="h-3 w-3" />
                  {t('pages.signInForm.containsLetters')}
                </div>
                <div
                  className={`flex items-center gap-1 ${/\d/.test(newPassword) ? "text-green-600" : "text-gray-400"}`}
                >
                  <Icons.check className="h-3 w-3" />
                  {t('pages.signInForm.containsNumbers')}
                </div>
              </div>
            </div>
            <Button
              onClick={handleMigration}
              disabled={migrationLoading || !newPassword || !!passwordError}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-2.5 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {migrationLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t('pages.signInForm.migratingAccount')}
                </>
              ) : (
                <>
                  <Icons.check className="mr-2 h-4 w-4" />
                  {t('pages.signInForm.migrateAndSignIn')}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
