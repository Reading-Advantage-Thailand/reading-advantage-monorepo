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
  license: z.string().uuid({ message: "Invalid UUID format" }),
});

export function UpdateUserLicenseForm({
  username,
  userId,
  expired,
}: {
  username: string;
  userId: string;
  expired?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      license: "",
    },
  });
  const t = useTranslations("Settings.userProfile");
  //   const { update } = useSession();
  const router = useRouter();
  //   const date = new Date(expired);

  //console.log(form.formState.isValid);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      // Update the user's username
      const response = await fetch(`/api/licenses/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          key: data.license,
          userId,
        }),
      });

      const res = await response.json();

      if (!response.ok) {
        toast("An error occurred.", {
          description: `${res.message}`,
        });
      } else {
        // Reset the form
        form.reset({ license: data.license });

        //   // update user session token
        //   await update({ name: data.name });

        // refresh the page
        router.refresh();

        toast("User license updated", {
          description: `The user license has been updated to ${data.license}`,
        });
      }
    } catch (error) {
      toast("An error occurred.", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mb-3 space-y-2">
        <FormField
          control={form.control}
          name="license"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("license")}</FormLabel>
              <FormDescription>{t("licenseDescription")}</FormDescription>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="text-sm text-gray-500">
          <span>
            {/* <strong>Current License:</strong> {date.toUTCString()} */}
          </span>
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={isLoading || !form.formState.isValid}
        >
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {t("activate")}
        </Button>
      </form>
    </Form>
  );
}
