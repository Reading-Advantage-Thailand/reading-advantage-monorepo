"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useEffect, useState } from "react";
import { fetchStudentsByClassCode } from "@/actions/classroom";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { classCodeSchema } from "@/lib/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormError } from "../form-error";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export function StudentSignInForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const params = useSearchParams();
  const classCode = params.get("classroom_code");
  const callbackUrl = params.get("callbackUrl");
  const [step, setStep] = useState<"code" | "select">("code");
  const [code, setCode] = useState("");
  const [students, setStudents] = useState<
    {
      id: string;
      name: string;
      student: { id: string; name: string; email: string };
    }[]
  >([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const t = useTranslations("AuthPage.signin");

  const form = useForm<z.infer<typeof classCodeSchema>>({
    resolver: zodResolver(classCodeSchema),
    defaultValues: {
      classroomCode: "",
    },
  });

  useEffect(() => {
    const signInWithClassCode = async () => {
      if (classCode) {
        const result = await fetchStudentsByClassCode(classCode);

        if (result.success) {
          setStudents(result.students);
          setCode(classCode);
          setStep("select");
        } else {
          setError(result.error);
          toast.error(result.error);
        }
      }
    };

    signInWithClassCode();
  }, [classCode]);

  const onSubmit = async (data: z.infer<typeof classCodeSchema>) => {
    const result = await fetchStudentsByClassCode(data.classroomCode);

    if (result.success) {
      setStudents(result.students);
      setCode(data.classroomCode);
      setStep("select");
    } else {
      setError(result.error);
      toast.error(result.error);
    }
  };

  async function handleLogin() {
    // try {
    //   const response = await fetch("/api/auth/signin", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       type: "student",
    //       email: selectedStudentId,
    //       password: code,
    //     }),
    //   });
    //   const data = await response.json();
    //   if (data.success) {
    //     // Handle successful login - redirect manually
    //     const redirectUrl = callbackUrl || "/student/read";
    //     window.location.href = redirectUrl;
    //   } else {
    //     setError(data.error);
    //     toast.error(data.error);
    //   }
    // } catch (error) {
    //   setError("An unexpected error occurred");
    //   toast.error("An unexpected error occurred");
    //   console.error("Login error:", error);
    // }
    signIn("credentials", {
      type: "student",
      email: selectedStudentId,
      password: code,
      // callbackUrl: callbackUrl || undefined,
    });
  }

  return (
    <>
      {step === "code" && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className={cn("flex flex-col gap-6", className)}
            {...props}
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <h1 className="text-2xl font-bold">{t("welcome")}</h1>
              <p className="text-muted-foreground text-sm text-balance">
                {t("enterClassroomCode")}
              </p>
            </div>
            <FormField
              control={form.control}
              name="classroomCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("classroomCode")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      onChange={(e) => {
                        field.onChange(e);
                        setError("");
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormError message={error} />
            <div className="grid gap-4">
              <Button type="submit" className="w-full">
                {t("next")}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {step === "select" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">{t("welcome")}</h1>
            <p className="text-muted-foreground text-sm text-balance">
              {t("selectYourName")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label>{t("selectYourNameLabel")}</Label>
            <Select onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("selectYourNamePlaceholder")} />
              </SelectTrigger>
              <SelectContent className="max-h-48 overflow-y-auto">
                <SelectGroup>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.student.email}>
                      {student.student.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            disabled={!selectedStudentId}
            onClick={handleLogin}
          >
            {t("login")}
          </Button>
        </div>
      )}
    </>
  );
}
