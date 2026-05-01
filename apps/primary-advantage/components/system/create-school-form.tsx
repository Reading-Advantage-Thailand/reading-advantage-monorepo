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
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { Building2, User, Mail } from "lucide-react";

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

interface CreateSchoolFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CreateSchoolForm({
  onSuccess,
  onCancel,
}: CreateSchoolFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SchoolFormData>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      contactEmail: "",
    },
  });

  const onSubmit = async (data: SchoolFormData) => {
    setIsLoading(true);

    try {
      // Convert empty string to undefined for optional email field
      const submitData = {
        ...data,
        contactEmail: data.contactEmail === "" ? undefined : data.contactEmail,
        contactName: data.contactName === "" ? undefined : data.contactName,
      };

      const response = await fetch("/api/schools", {
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

      toast.success("School created successfully!", {
        description: `${school.name} has been added to the system.`,
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create school", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                School Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter school name"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                The official name of the school or institution.
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
                Contact Name
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter contact person's name (optional)"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                The name of the primary contact person for this school.
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
                Contact Email
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="Enter contact email (optional)"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>
                The email address of the primary contact person.
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
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create School
          </Button>
        </div>
      </form>
    </Form>
  );
}
