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
import { useRouter } from "@/i18n/navigation";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const FormSchema = z.object({
  name: z
    .string()
    .min(3, {
      message: "License name must be at least 3 characters.",
    })
    .max(100, {
      message: "License name must be at most 100 characters.",
    }),
  description: z
    .string()
    .max(500, {
      message: "Description must be at most 500 characters.",
    })
    .optional(),
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

export function CreateLicenseForm() {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      description: "",
      maxUsers: 100,
      startDate: new Date(),
      status: "active",
      schoolId: "",
    },
  });
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);

      // Create the license
      const response = await fetch("/api/licenses", {
        method: "POST",
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
        throw new Error("Failed to create license");
      }

      const result = await response.json();

      // Reset the form
      form.reset({
        name: "",
        maxUsers: 100,
        subscriptionType: "basic",
        startDate: new Date(),
        expiryDays: undefined,
        status: "active",
        schoolId: "",
      });

      router.refresh();
      toast.success("License created successfully!", {
        description: `License "${data.name}" has been created with key: ${result.key}`,
      });
    } catch (error) {
      console.error("Error creating license:", error);
      toast.error("Failed to create license", {
        description:
          "Please try again or contact support if the problem persists.",
      });
    } finally {
      setIsLoading(false);
      router.push("/system/licenses");
    }
  }

  useEffect(() => {
    const fetchSchools = async () => {
      const response = await fetch("/api/schools");
      const data = await response.json();
      const schools = data.filter((school: any) => !school.licenses.length);
      setSchools(schools);
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
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="schoolId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School (Optional)</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a School" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* <SelectItem value="">
                        No School (General License)
                      </SelectItem> */}
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
                  The school that this license is for (optional)
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
                  defaultValue={field.value}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
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

        {/* <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter a description for this license..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                Additional details about this license
              </FormDescription>
            </FormItem>
          )}
        /> */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
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

          <FormField
            control={form.control}
            name="expiryDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Duration (Optional)</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value ? Number(value) : undefined)
                  }
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select expiry duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">No expiry</SelectItem>
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
                  License will expire after this many days from start date
                </FormDescription>
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading} className="min-w-32">
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create License
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset Form
          </Button>
        </div>
      </form>
    </Form>
  );
}
