"use client";

import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, User, Mail, Lock, Users, UserCog } from "lucide-react";
import { toast } from "sonner";

// Schema will be created inside the component to access translations

interface TeacherFormData {
  name: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
}

export default function AddTeacherPage() {
  const t = useTranslations("AdminTeachers.Add");
  const tRoles = useTranslations("AdminTeachers.Table.roles");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const teacherFormSchema = z
    .object({
      name: z
        .string()
        .min(2, t("schema.nameMin"))
        .max(100, t("schema.nameMax")),
      email: z.string().email(t("schema.emailInvalid")),
      role: z.string().min(1, t("schema.roleRequired")),
      password: z
        .string()
        .min(6, t("schema.passwordMin"))
        .max(100, t("schema.passwordMax")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("schema.passwordsDontMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: TeacherFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/teachers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || t("toasts.createError"));
      }

      toast.success(t("toasts.createdSuccess"));
      form.reset();
      router.push("/admin/teachers");
    } catch (error) {
      console.error("Error creating teacher:", error);
      toast.error(
        error instanceof Error ? error.message : t("toasts.createError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Header heading={t("title")} text={t("subtitle")} />
      <Separator className="my-4" />

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("cardTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-6">
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t("form.name")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("placeholders.name")}
                            {...field}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {t("form.email")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder={t("placeholders.email")}
                            {...field}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Role */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <UserCog className="h-4 w-4" />
                          {t("form.role")}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-11">
                              <SelectValue
                                placeholder={t("placeholders.role")}
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="teacher">
                              {tRoles("teacher")}
                            </SelectItem>
                            <SelectItem value="admin">
                              {tRoles("admin")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Fields in Grid */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Password */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t("form.password")}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder={t("placeholders.password")}
                                {...field}
                                className="h-11 pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Confirm Password */}
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            {t("form.confirmPassword")}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder={t("placeholders.confirmPassword")}
                                {...field}
                                className="h-11 pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
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
                    {isSubmitting ? t("buttons.creating") : t("buttons.create")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isSubmitting}
                    className="h-11 flex-1 sm:flex-none"
                  >
                    {t("buttons.reset")}
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
