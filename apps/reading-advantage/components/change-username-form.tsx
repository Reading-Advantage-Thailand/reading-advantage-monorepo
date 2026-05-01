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
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  display_name: z.string().min(5, {
    message: "Username must be at least 5 characters.",
  }),
});

export function ChangeUsernameForm({
  username,
  userId,
}: {
  username: string;
  userId: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      display_name: username,
    },
  });
  const { update } = useSession();
  const router = useRouter();

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      setIsLoading(true);
      // Update the user's username
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update username.");
      }

      // Reset the form
      form.reset({ display_name: data.display_name });

      // update user session token
      await update({ user: { display_name: data.display_name } });

      // refresh the page
      router.refresh();

      toast({
        title: "Username updated.",
        description: `Changed username to ${data.display_name}.`,
      });
    } catch (error) {
      toast({
        title: "An error occurred.",
        description: "Please try again later.",
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
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormDescription>
                The username is used to represent themselves on the platform.
              </FormDescription>
              <FormControl>
                <Input type="text" placeholder={username} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={
            isLoading ||
            !form.formState.isValid ||
            form.watch("display_name") === username
          }
        >
          {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
          Update
        </Button>
      </form>
    </Form>
  );
}
