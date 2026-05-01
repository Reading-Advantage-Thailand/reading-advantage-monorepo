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
import { License } from "@prisma/client";

// Extended license type with school info
type LicenseWithSchool = License & {
  School?: {
    id: string;
    name: string;
  } | null;
};

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
      name: license.name,
      maxUsers: license.maxUsers,
      startDate: new Date(license.startDate),
      expiryDays: getExpiryDays(
        new Date(license.startDate),
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
        throw new Error(errorData.error || "Failed to update license");
      }

      const result = await response.json();

      toast.success("License updated successfully!", {
        description: `License "${data.name}" has been updated.`,
      });

      // Call success callback
      onSuccess?.();
    } catch (error) {
      console.error("Error updating license:", error);
      toast.error("Failed to update license", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or contact support if the problem persists.",
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
                <FormLabel>License Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter license name" {...field} />
                </FormControl>
                <FormMessage />
                <FormDescription>
                  A descriptive name for this license
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select license status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>Current status of the license</FormDescription>
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
                <FormLabel>School</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === "no-school" ? "" : value)
                    }
                    value={field.value || "no-school"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a School" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no-school">
                        No School (General License)
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
                  The school that this license is assigned to
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subscriptionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscription Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value.toLowerCase()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subscription type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
                <FormDescription>
                  The subscription type for this license
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
                <FormLabel>Maximum Users</FormLabel>
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
                  Maximum number of users allowed for this license
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
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
                          <span>Pick a date</span>
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
                  When this license becomes active
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
              <FormLabel>Expiry Duration</FormLabel>
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
                    <SelectValue placeholder="Select expiry duration" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="no-expiry">No expiry</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days (6 months)</SelectItem>
                  <SelectItem value="365">365 days (1 year)</SelectItem>
                  <SelectItem value="730">730 days (2 years)</SelectItem>
                  <SelectItem value="1095">1095 days (3 years)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
              <FormDescription>
                License will expire after this many days from start date. Select
                "No expiry" for permanent licenses.
              </FormDescription>
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading} className="min-w-32">
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Update License
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
