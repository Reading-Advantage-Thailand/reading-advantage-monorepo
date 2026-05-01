import { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { UserSignInForm } from "@/components/user-signin-form";
import SignInErrorHandler from "@/components/signin-error-handler";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <>
      <Link
        href="/auth/signup"
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "absolute right-4 top-4 md:right-8 md:top-8"
        )}
      >
        Sign up
      </Link>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and password to sign in.
            </p>
          </div>
          <Suspense fallback={null}>
            <SignInErrorHandler />
          </Suspense>
          <UserSignInForm />
        </div>
      </div>
    </>
  );
}
