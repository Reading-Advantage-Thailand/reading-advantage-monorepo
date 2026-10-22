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
import { TemporaryPasswordStep } from "./temporary-password-step";
import { useTranslations } from "next-intl";

export function TeacherSignInForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = safeCallbackPath(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | undefined>("");
  const [isLoading, setIsLoading] = useState(false);
  // Set after a correct temporary password (FR-5): the user sets a new password first.
  const [pendingChange, setPendingChange] = useState<{ username: string; password: string } | null>(null);
  const { login } = useAuth();
  const t = useTranslations("AuthPage");

  /** Opens the callback page, or lets the proxy send the user to the role's home page. */
  const enter = () => {
    if (callbackUrl) router.push(callbackUrl);
    else router.replace("/auth/signin");
  };

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
      enter();
    } catch (err) {
      if ((err as { code?: string }).code === "PASSWORD_CHANGE_REQUIRED") {
        setPendingChange({ username: value.username, password: value.password });
        return;
      }
      // The server text is English: show a translated text by the status (defect 2, 2026-10-20).
      const status = (err as { status?: number }).status;
      setError(t(status === 401 ? "staff.invalid" : status === 429 ? "staff.tooMany" : "staff.failed"));
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingChange) {
    return (
      <TemporaryPasswordStep
        username={pendingChange.username}
        temporaryPassword={pendingChange.password}
        onChanged={async (newPassword) => {
          await login(pendingChange.username, newPassword);
          enter();
        }}
      />
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{t("signin.welcome")}</h1>
          <p className="text-muted-foreground text-sm text-balance">{t("staff.help")}</p>
        </div>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("staff.username")}</FormLabel>
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
                <span>{t("staff.password")}</span>
                <Link
                  href="/auth/forgot-password"
                  className={cn(
                    "text-muted-foreground text-sm font-normal underline-offset-4 hover:underline",
                  )}
                >
                  {t("staff.forgot")}
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
            {isLoading ? t("staff.signingIn") : t("staff.submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
