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
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const FormSchema = z.object({
  name: z.string().min(5, {
    message: "Username must be at least 5 characters.",
  }),
});

export function ChangeUsernameForm({
  username,
  userId,
}: {
  username: string;
  userId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { update: updateSession } = useSession();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: username,
    },
  });
  const router = useRouter();
  const { data: session, update } = useSession();
  const t = useTranslations("Settings.userProfile");
  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      // Update the user's username
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update username.");
      }
      if (response.status === 200) {
        // Reset the form
        form.reset({ name: data.name });

        // Update the session with the complete user data
        await updateSession({
          user: {
            ...data,
          },
        });

        update({
          user: {
            ...session?.user,
          },
        });

        // refresh the page
        router.refresh();

        toast("Username updated.", {
          description: `Changed username to ${data.name}.`,
        });
      }
    } catch (error) {
      //   toast({
      //     title: "An error occurred.",
      //     description: "Please try again later.",
      //     variant: "destructive",
      //   });
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
              <FormLabel>{t("username")}</FormLabel>
              <FormDescription>{t("usernameDescription")}</FormDescription>
              <FormControl>
                <Input type="text" placeholder={username} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
