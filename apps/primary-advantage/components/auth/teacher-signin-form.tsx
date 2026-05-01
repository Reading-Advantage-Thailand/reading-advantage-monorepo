"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "../icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { signInSchema } from "@/lib/zod";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { signInAction } from "@/actions/singinAction";
import { FormError } from "../form-error";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function TeacherSignInForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const urlError =
    searchParams.get("error") === "OAuthAccountNotLinked"
      ? "Email already exists"
      : "";
  const [error, setError] = useState<string | undefined>("");
  const t = useTranslations("AuthPage.signin");
  const [isPanding, startTransition] = useTransition();
  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (value: z.infer<typeof signInSchema>) => {
    setError("");

    startTransition(async () => {
      // try {
      //   const response = await fetch("/api/auth/signin", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({
      //       ...value,
      //       type: "other",
      //     }),
      //   });
      //   const data = await response.json();
      //   if (data.success) {
      //     // Handle successful login - redirect manually
      //     const redirectUrl = callbackUrl || "/auth/signin";
      //     window.location.href = redirectUrl;
      //   } else {
      //     setError(data.error);
      //   }
      // } catch (error) {
      //   setError("An unexpected error occurred");
      //   console.error("Login error:", error);
      // }
      signInAction(
        {
          ...value,
          type: "other",
        },
        // callbackUrl || undefined,
      ).then((data) => {
        if (data?.error) {
          setError(data?.error);
        }
      });
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Welcome to Primary Advantage</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Enter your email below to login to your account
          </p>
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  disabled={isPanding}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center justify-between">
                <span>Password</span>
                <a
                  href="/auth/forgot-password"
                  className={cn(
                    "text-muted-foreground text-sm font-normal underline-offset-4 hover:underline",
                  )}
                >
                  Forgot your password?
                </a>
              </FormLabel>

              <FormControl>
                <Input
                  type="password"
                  placeholder="********"
                  disabled={isPanding}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormError message={error || urlError} />
        <div className="grid gap-6">
          <Button type="submit" className="w-full">
            Login
          </Button>
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or continue with
            </span>
          </div>
          <Button
            variant="outline"
            type="button"
            className="w-full cursor-pointer"
            onClick={() => {
              signIn("google", {
                callbackUrl: callbackUrl || "/auth/signin",
              });
            }}
          >
            <Icons.google className="mr-2 h-4 w-4" />
            Login with Google
          </Button>
        </div>
        <div className="text-center text-sm">
          Don&apos;t have an account?{" "}
          <a href="/auth/signup" className="underline underline-offset-4">
            Sign up
          </a>
        </div>
      </form>
    </Form>
  );
}
