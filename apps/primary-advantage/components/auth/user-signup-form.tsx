"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { signUpSchema } from "@/lib/zod";
import { signUpAction } from "@/actions/signupAction";
import { FormError } from "../form-error";
import { FormSuccess } from "../form-success";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [isPanding, startTransition] = useTransition();
  const [loading, setLoading] = useState<boolean>(false);
  const [accepted, setAccepted] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>("");
  const [success, setSuccess] = useState<string | undefined>("");
  const router = useRouter();

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (value: z.infer<typeof signUpSchema>) => {
    setError("");
    setSuccess("");

    startTransition(() => {
      signUpAction(value).then((data) => {
        setError(data.error);
        setSuccess(data.success);
        if (data.success) {
          setTimeout(() => {
            router.push("/auth/signin");
          }, 1500);
        }
      });
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("flex flex-col gap-6", className)}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Join us and explore the platform!
          </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  type="name"
                  placeholder="John Doe"
                  disabled={isPanding}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  disabled={isPanding}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" disabled={isPanding} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" disabled={isPanding} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormError message={error} />
        <FormSuccess message={success} />

        <div className="text-muted-foreground flex flex-col gap-1 text-xs">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={accepted}
              onCheckedChange={(value) => setAccepted(!!value)}
            />
            <label
              htmlFor="terms"
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Accept terms and conditions
            </label>
          </div>
          <div>
            By signing up, you agree to our{" "}
            <a href="#" className="underline underline-offset-2">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline underline-offset-2">
              Privacy Policy
            </a>
            .
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!accepted || isPanding}
        >
          {loading ? "Creating account..." : "Sign up"}
        </Button>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <a href="/auth/signin" className="underline underline-offset-2">
            Login
          </a>
        </div>
      </form>
    </Form>
  );
}
