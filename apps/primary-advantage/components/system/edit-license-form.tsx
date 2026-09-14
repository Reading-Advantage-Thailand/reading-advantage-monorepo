"use client";

import React from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { InferSelectModel } from "drizzle-orm";
import { licenses } from "@reading-advantage/db";
import type { LicenseWithSchool } from "@/types";

/**
 * License row type inferred from the Drizzle `licenses` table
 * (replaces the Prisma `License` model removed during
 * `primary_advantage_drizzle_migration_20260526`, Phase 6).
 */
type License = InferSelectModel<typeof licenses>;

// Extended license type with school info
const FormSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: "License name must be at least 3 characters.",
    })
    .max(100, {
      message: "License name must be at most 100 characters.",
    }),
  maxUsers: z
    .number()
    .int()
    .min(1, {
      message: "Maximum users must be at least 1.",
    })
    .max(10000, {
      message: "Maximum users cannot exceed 10,000.",
    }),
  startDate: z.date({
    required_error: "Start date is required.",
  }),
  expiryDays: z.number().int().positive().optional(),
  status: z.enum(["active", "inactive", "expired"], {
    required_error: "Please select a status.",
  }),
  schoolId: z.string().optional(),
  subscriptionType: z.enum(["basic", "premium", "enterprise"], {
    required_error: "Please select a subscription type.",
  }),
});

interface EditLicenseFormProps {
  license: LicenseWithSchool;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditLicenseForm({
  license,
  onSuccess,
  onCancel,
}: EditLicenseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const t = useTranslations("LicenseForm");

  // Calculate expiry days from current license
  const getExpiryDays = (startDate: Date, expiryDate: Date | null) => {
    if (!expiryDate) return undefined;
    const diffTime = expiryDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : undefined;
  };

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: license.name ?? "",
      maxUsers: license.maxUsers,
      startDate: new Date(license.startDate ?? license.createdAt),
      expiryDays: getExpiryDays(
        new Date(license.startDate ?? license.createdAt),
        license.expiryDate ? new Date(license.expiryDate) : null,
      ),
      status: license.status as "active" | "inactive" | "expired",
      schoolId: license.schoolId || undefined,
      subscriptionType: license.subscription.toLowerCase() as
        | "basic"
        | "premium"
        | "enterprise",
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);

      // Update the license
      const response = await fetch(`/api/licenses/${license.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate.toISOString(),
          expiryDays: data.expiryDays,
          schoolId: data.schoolId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("updateError"));
      }

      const result = await response.json();

      toast.success(t("updateSuccess"), {
        description: t("updateSuccessDescription", { name: data.name }),
      });

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error("Error updating license:", error);
      toast.error(t("updateError"), {
        description:
          error instanceof Error ? error.message : t("fallbackError"),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch("/api/schools");
        if (response.ok) {
          const data = await response.json();
          const filteredData = data.filter(
            (school: any) =>
              !school.licenses.length || school.id === license.schoolId,
          );
          setSchools(filteredData);
        }
      } catch (error) {
        console.error("Failed to fetch schools:", error);
      }
    };
    fetchSchools();
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("name")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("namePlaceholder")} {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  {t("nameDescription")}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("status")}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("statusPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">{t("statusActive")}</SelectItem>
                    <SelectItem value="inactive">{t("statusInactive")}</SelectItem>
                    <SelectItem value="expired">{t("statusExpired")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>{t("statusDescription")}</FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="schoolId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("school")}</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "no-school" ? "" : value)
                    }
                    value={field.value || "no-school"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("schoolPlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no-school">
                        {t("noSchool")}
                      </SelectItem>
                      {schools.map((school) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
                <FormDescription>
                  {t("schoolDescription")}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subscriptionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("subscriptionType")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value.toLowerCase()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("subscriptionPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="basic">{t("subBasic")}</SelectItem>
                    <SelectItem value="premium">{t("subPremium")}</SelectItem>
                    <SelectItem value="enterprise">{t("subEnterprise")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>
                  {t("subscriptionDescription")}
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="maxUsers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("maxUsers")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  {t("maxUsersDescription")}
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{t("startDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{t("pickDate")}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
                <FormDescription>
                  {t("startDateDescription")}
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="expiryDays"
          render={({ field }) => (
              <FormItem>
                <FormLabel>{t("expiryDuration")}</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(
                      value === "no-expiry" ? undefined : Number(value),
                    )
                  }
                  value={field.value ? field.value.toString() : "no-expiry"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t("expiryPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="no-expiry">{t("noExpiry")}</SelectItem>
                    <SelectItem value="30">{t("days", { count: 30 })}</SelectItem>
                    <SelectItem value="90">{t("days", { count: 90 })}</SelectItem>
                    <SelectItem value="180">{t("months6")}</SelectItem>
                    <SelectItem value="365">{t("year1")}</SelectItem>
                    <SelectItem value="730">{t("years2")}</SelectItem>
                    <SelectItem value="1095">{t("years3")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>
                  {t("expiryDescription")}
                </FormDescription>
              </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading} className="min-w-32">
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("update")}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
