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

const FormSchema = z.object({
  school_name: z
    .string()
    .min(5, {
      message: "School name must be at least 5 characters.",
    })
    .max(60, {
      message: "School name must be at most 60 characters.",
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

export function CreateLicenseForm() {
  const [isLoading, setIsLoading] = useState(false);
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
        total_licenses: data.total,
        subscription_level: data.subscription_level,
        school_name: data.school_name,
        admin_id: data.admin_id,
        expiration_date: data.expiration_date,
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
        title: "Created licenses.",
        description: `Created ${data.total} ${data.subscription_level} licenses for ${data.school_name}.`,
      });
    } catch (error) {
      toast({
        title: "An error occurred.",
        description: `Failed to create licenses`,
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
              <FormLabel>School name</FormLabel>
              <FormControl>
                <Input type="text" placeholder="name" {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>The name of the school</FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="admin_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin ID</FormLabel>
              <FormControl>
                <Input type="text" placeholder="ID" {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>
                The id of the admin that will be assigned to manage the school.
                Responsible for admin roles.
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="total"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="total licenses"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                The total number of licenses to create.
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subscription_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subscription Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subscription level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={LicenseSubScriptionLevel.BASIC}>
                    Basic
                  </SelectItem>
                  <SelectItem value={LicenseSubScriptionLevel.PREMIUM}>
                    Premium
                  </SelectItem>
                  <SelectItem value={LicenseSubScriptionLevel.ENTERPRISE}>
                    Enterprise
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              <FormDescription>
                The subscription level for the licenses.
              </FormDescription>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="expiration_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiration Date</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Expiration Date" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={"180"}>180 day</SelectItem>
                  <SelectItem value={"360"}>360 day</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              <FormDescription>
                The Expiration Date for the licenses.
              </FormDescription>
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
          Create Licenses
        </Button>
      </form>
    </Form>
  );
}
