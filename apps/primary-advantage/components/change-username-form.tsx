"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { useSession } from "@reading-advantage/auth-client";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const FormSchema = z.object({
  name: z.string().trim().min(2).max(40),
});

/**
 * Form that changes the display name of the signed-in user through PATCH /api/users/me.
 * The sign-in username never changes here.
 * @param props.username The current display name.
 */
export function ChangeUsernameForm({
  username,
}: {
  username: string;
  userId?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: username,
    },
  });
  const router = useRouter();
  const t = useTranslations("Settings.userProfile");
  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const message = response.status === 403 ? t("codeOnlyError") : t("updateError");
        setErrorMessage(message);
        toast.error(message);
        return;
      }
      form.reset({ name: data.name.trim() });
      router.refresh();
      toast.success(t("updateSuccess"), { description: data.name.trim() });
    } catch {
      setErrorMessage(t("updateError"));
      toast.error(t("updateError"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mb-3 space-y-2">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("displayName")}</FormLabel>
              <FormDescription>{t("displayNameDescription")}</FormDescription>
              <FormControl>
                <Input type="text" placeholder={username} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {errorMessage ? (
          <p role="alert" className="rounded-md border border-red-700 bg-red-100 px-3 py-2 text-sm text-red-900">
            {errorMessage}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={
            isLoading ||
            !form.formState.isValid ||
            form.watch("name") === username
          }
        >
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {t("update")}
        </Button>
      </form>
    </Form>
  );
}
