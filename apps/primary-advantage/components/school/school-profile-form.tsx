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
import { Building2, User, Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const schoolFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "School name must be at least 2 characters.",
    })
    .max(100, {
      message: "School name must be at most 100 characters.",
    }),
  contactName: z
    .string()
    .max(100, {
      message: "Contact name must be at most 100 characters.",
    })
    .optional(),
  contactEmail: z
    .string()
    .email({
      message: "Please enter a valid email address.",
    })
    .optional()
    .or(z.literal("")),
});

type SchoolFormData = z.infer<typeof schoolFormSchema>;

interface SchoolProfileFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function SchoolProfileForm({
  onSuccess,
  onCancel,
}: SchoolProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, update } = useSession();
  const router = useRouter();
  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactEmail: "",
    },
  });
  const t = useTranslations("Settings.schoolProfile");

  const onSubmit = async (data: SchoolFormData) => {
    setIsLoading(true);

    try {
      // Convert empty string to undefined for optional email field
      const submitData = {
        ...data,
        contactEmail: data.contactEmail === "" ? undefined : data.contactEmail,
        contactName: data.contactName === "" ? undefined : data.contactName,
      };

      const response = await fetch("/api/users/me/school", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create school");
      }

      const school = await response.json();

      if (school.roleUpgraded) {
        await update({
          ...session,
          user: { ...session?.user, role: "admin" },
        });
      }

      toast.success("School created successfully!", {
        description: school.roleUpgraded
          ? `${school.name} has been created and you've been upgraded to admin to access admin features.`
          : `${school.name} has been created and associated with your account.`,
      });

      form.reset();
      onSuccess();
    } catch (error) {
      toast.error("Failed to create school", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {t("createSchool")}
        </CardTitle>
        <CardDescription>{t("createSchoolDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t("schoolName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("schoolNamePlaceholder")}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("schoolNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("contactName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("contactNamePlaceholder")}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("contactNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t("contactEmail")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("contactEmailPlaceholder")}
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("contactEmailDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  {t("cancel")}
                </Button>
              )}
              <Button type="submit" disabled={isLoading}>
                {isLoading && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t("createSchoolButton")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
