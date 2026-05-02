"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useTrpcAuth } from "@/lib/use-trpc-auth";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserSignUpForm({ className, ...props }: UserAuthFormProps) {
  const { register, isLoading, error: authError } = useTrpcAuth();
  const [error, setError] = React.useState<string>("");

  const displayError = authError || error;

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setError("");
    
    const target = event.target as typeof event.target & {
      email: { value: string };
      password: { value: string };
      confirmPassword: { value: string };
    };
    
    const email = target.email.value;
    const password = target.password.value;
    const confirmPassword = target.confirmPassword.value;
    if (password !== confirmPassword) {
      setError("Password does not match");
      return;
    }
    const user = await register(email, password, email.split("@")[0]);
    if (user) {
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
              placeholder="name@example.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
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
              placeholder="password"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid gap-1">
            <Label className="sr-only" htmlFor="confirmPassword">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              placeholder="confirm password"
              type="password"
              autoCapitalize="none"
              autoComplete="password"
              autoCorrect="off"
              disabled={isLoading}
              required
            />
          </div>
          {displayError && <div className="text-red-500 text-sm">{displayError}</div>}
          <Button disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Account
          </Button>
        </div>
      </form>
    </div>
  );
}
