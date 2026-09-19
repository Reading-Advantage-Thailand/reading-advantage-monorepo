"use client";

import { Button } from "@reading-advantage/ui";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { buildSignInHref } from "@/app/lib/sign-in-href";

const LOGIN_ERRORS: Readonly<Record<string, string>> = {
  forbidden: "Your company account does not have access to Accounting.",
  sso: "Company sign-in failed. Try signing in again.",
};

function LoginContent() {
  const searchParams = useSearchParams();
  const returnTo = searchParams?.get("returnTo");
  const error = searchParams?.get("error");
  const queryIndex = returnTo?.indexOf("?") ?? -1;
  const signInHref = returnTo
    ? buildSignInHref(
        queryIndex === -1 ? returnTo : returnTo.slice(0, queryIndex),
        queryIndex === -1 ? "" : returnTo.slice(queryIndex),
      )
    : "/api/auth/company/start";
  const errorMessage = error ? LOGIN_ERRORS[error] : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-3xl font-bold">Accounting sign in</h1>
      <p className="text-muted-foreground">
        Use your company account to access the accounting workspace.
      </p>
      {errorMessage ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
      <Button asChild>
        <a href={signInHref}>Sign in with Company SSO</a>
      </Button>
    </main>
  );
}

/**
 * Renders the single company-account handoff for Accounting.
 * @returns The company-account sign-in landing page.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
