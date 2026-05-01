"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { signIn } from "next-auth/react";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserResetPassForm({ className, ...props }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isEmailSent, setIsEmailSent] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    const target = event.target as typeof event.target & {
      email: { value: string };
    };
    const email = target.email.value;
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setIsEmailSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.message || "Something went wrong");
      }
    } catch (e) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <>
      {!isEmailSent ? (
        <>
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and we’ll send you a link to reset your password.
            </p>
          </div>
          <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
              <div className="grid gap-2">
                <div className="grid gap-1">
                  <Label className="sr-only" htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    disabled={isLoading}
                    required
                  />
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <Button disabled={isLoading}>
                  {isLoading && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Forgot Password Email
                </Button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <div className="flex flex-col space-y-2 text-center justify-center items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="88"
            height="88"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#73f79c"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            className="lucide lucide-shield-check"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <h1 className="text-2xl font-semibold tracking-tight text-green-300">
            The email has been sent!. Please check your email to reset your
            password.
          </h1>
        </div>
      )}
    </>
  );
}
