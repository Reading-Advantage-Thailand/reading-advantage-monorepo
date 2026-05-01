"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ShieldCheck } from "lucide-react";

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
      // const response = await fetch("/api/send", {
      //   method: "POST",
      //   body: JSON.stringify({ email }),
      // });
      // if (!response.ok) {
      //   throw new Error("Failed to send email");
      // }
      setIsEmailSent(true);
      setIsLoading(false);
    } catch (error) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
    // sendPasswordResetEmail(firebaseAuth, email, {
    //     url: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/signin`,
    //     handleCodeInApp: true,
    // }).then(() => {
    //     // Password reset email sent!
    //     setIsEmailSent(true)
    // }).catch((error) => {
    //     setError('Something went wrong');
    // }).finally(() => {
    //     setIsLoading(false)
    // });
  }
  return (
    <>
      {!isEmailSent ? (
        <>
          <div className="mb-2 flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Forgot your password?
            </h1>
            <p className="text-muted-foreground text-sm">
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
                {error && <div className="text-sm text-red-500">{error}</div>}
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
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <ShieldCheck width={88} height={88} className="stroke-[#73f79c]" />
          <h1 className="text-2xl font-semibold tracking-tight text-green-300">
            The email has been sent!. Please check your email to reset your
            password.
          </h1>
        </div>
      )}
    </>
  );
}
