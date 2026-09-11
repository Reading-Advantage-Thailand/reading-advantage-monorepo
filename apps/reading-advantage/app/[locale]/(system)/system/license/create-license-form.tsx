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
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";
import { Icons } from "@/components/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { licenseService } from "@/client/services/firestore-client-services";
import {
  LicenseSubScriptionLevel,
  LicenseExpirationDate,
} from "@/server/models/enum";
import { useScopedI18n } from "@/locales/client";

export function CreateLicenseForm() {
  const [isLoading, setIsLoading] = useState(false);
  const t = useScopedI18n("pages.systemLicense.form");
  const FormSchema = z.object({
    school_name: z
      .string()
      .min(5, {
        message: t("schoolNameMin"),
      })
      .max(60, {
        message: t("schoolNameMax"),
      }),
    total: z.number().int().min(1),
    subscription_level: z.enum([
      LicenseSubScriptionLevel.BASIC,
      LicenseSubScriptionLevel.PREMIUM,
      LicenseSubScriptionLevel.ENTERPRISE,
    ]),
    admin_id: z.string(),
    expiration_date: z.enum([
      LicenseExpirationDate.HALFYEARS,
      LicenseExpirationDate.FULLYEARS,
    ]),
  });
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      total: 1,
      subscription_level: LicenseSubScriptionLevel.BASIC,
      school_name: "",
      admin_id: "",
      expiration_date: LicenseExpirationDate.HALFYEARS,
    },
  });
  const router = useRouter();

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);

      // Create the licenses
      const response = await licenseService.licenses.createDoc({
        maxUsers: data.total,
        usedLicenses: 0,
        licenseType: data.subscription_level,
        schoolName: data.school_name,
        ownerUserId: data.admin_id,
        expiresAt: data.expiration_date,
      });
      // Reset the form
      form.reset({
        total: 1,
        subscription_level: LicenseSubScriptionLevel.BASIC,
        school_name: "",
        expiration_date: LicenseExpirationDate.HALFYEARS,
      });

      router.refresh();
      toast({
        title: t("createdTitle"),
        description: t("createdDescription", {
          total: data.total,
          level: data.subscription_level,
          school: data.school_name,
        }),
      });
    } catch (error) {
      toast({
        title: t("errorTitle"),
        description: t("errorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 mb-3">
        <FormField
          control={form.control}
          name="school_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("schoolName")}</FormLabel>
              <FormControl>
                <Input type="text" placeholder={t("schoolNamePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>{t("schoolNameDescription")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="admin_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("adminId")}</FormLabel>
              <FormControl>
                <Input type="text" placeholder={t("adminIdPlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>{t("adminIdDescription")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="total"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("total")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder={t("totalPlaceholder")}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>{t("totalDescription")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subscription_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("subscriptionLevel")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("subscriptionPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={LicenseSubScriptionLevel.BASIC}>
                    {t("basic")}
                  </SelectItem>
                  <SelectItem value={LicenseSubScriptionLevel.PREMIUM}>
                    {t("premium")}
                  </SelectItem>
                  <SelectItem value={LicenseSubScriptionLevel.ENTERPRISE}>
                    {t("enterprise")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              <FormDescription>{t("subscriptionDescription")}</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expiration_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("expirationDate")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("expirationPlaceholder")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={"180"}>{t("days180")}</SelectItem>
                  <SelectItem value={"360"}>{t("days360")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              <FormDescription>{t("expirationDescription")}</FormDescription>
            </FormItem>
          )}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={isLoading || !form.formState.isValid}
        >
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          {t("createLicenses")}
        </Button>
      </form>
    </Form>
  );
}
