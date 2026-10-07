"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useState } from "react";
import { useAuth } from "@reading-advantage/auth-client";
import { FormError } from "../form-error";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { safeCallbackPath } from "@/lib/safe-callback-path";

export function TeacherSignInForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | undefined>("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (value: z.infer<typeof signInSchema>) => {
    setError("");
    setIsLoading(true);

    try {
      await login(value.username, value.password);
      // Without a callback, the proxy sends the user from the sign-in page to the role's home page.
      if (callbackUrl) router.push(callbackUrl);
      else router.replace("/auth/signin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
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
            Enter your username below to login to your account
          </p>
        </div>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  disabled={isLoading}
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
                <Link
                  href="/auth/forgot-password"
                  className={cn(
                    "text-muted-foreground text-sm font-normal underline-offset-4 hover:underline",
                  )}
                >
                  Forgot your password?
                </Link>
              </FormLabel>

              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="********"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormError message={error} />
        <div className="grid gap-6">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
