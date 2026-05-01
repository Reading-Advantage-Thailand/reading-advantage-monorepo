"use client";

import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Eye, EyeOff, User, Mail, Lock, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AddStudentPage() {
  const t = useTranslations("Admin.Students.Add");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const studentFormSchema = z.object({
    name: z.string().min(2, t("errors.nameMin")).max(100, t("errors.nameMax")),
    email: z.string().email(t("errors.emailInvalid")),
  });

  type StudentFormData = z.infer<typeof studentFormSchema>;

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create student");
      }

      toast.success(t("toastSuccess"));
      form.reset();
      router.push("/admin/students");
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error(error instanceof Error ? error.message : t("errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header heading={t("heading")} text={t("subtext")} />
      <Separator className="my-4" />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("cardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Full Name */}
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {t("nameLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("namePlaceholder")}
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Email */}
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {t("emailLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("emailPlaceholder")}
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex flex-col gap-3 pt-6 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-11 flex-1 sm:flex-none"
                  >
                    {isSubmitting ? t("submitting") : t("submit")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isSubmitting}
                    className="h-11 flex-1 sm:flex-none"
                  >
                    {t("reset")}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
