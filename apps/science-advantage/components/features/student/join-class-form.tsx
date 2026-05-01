"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  buildFormFields,
  type GeneratedFormField,
} from "@/lib/forms/from-zod"
import {
  joinClassSchema,
  type JoinClassInput,
} from "@/lib/validations/class"
import {
  JOIN_CODE_LENGTH,
  JOIN_CODE_PATTERN,
  sanitizeJoinCodeInput,
} from "@/lib/utils/join-code-format"

type JoinClassResponse =
  | {
      success: true
      classEnrollment: {
        id: string
        classId: string
        className: string
        gradeLevel: number
        teacherName: string
      }
    }
  | {
      success: false
      error?: string
    }

const JOIN_CLASS_FIELDS: GeneratedFormField[] = buildFormFields({
  schema: joinClassSchema,
  overrides: {
    joinCode: {
      label: "Class Code",
      description: "Enter the 6-character code your teacher shared with you.",
      placeholder: "ABC123",
      order: 1,
      inputProps: {
        maxLength: JOIN_CODE_LENGTH,
        pattern: JOIN_CODE_PATTERN,
        autoCorrect: "off",
        autoCapitalize: "characters",
        spellCheck: false,
        inputMode: "text",
      },
    },
  },
})

type JoinClassFormValues = JoinClassInput

export function JoinClassForm() {
  const router = useRouter()
  const form = useForm<JoinClassFormValues>({
    resolver: zodResolver(joinClassSchema),
    defaultValues: {
      joinCode: "",
    },
  })
  const [isPending, startTransition] = React.useTransition()

  const onSubmit = React.useCallback(
    (values: JoinClassFormValues) => {
      startTransition(async () => {
        try {
          const response = await fetch("/api/classes/join", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(values),
          })

          let body: JoinClassResponse

          try {
            body = (await response.json()) as JoinClassResponse
          } catch (parseError) {
            console.error("Failed to parse join class response", parseError)
            toast.error("Unexpected response from server")
            return
          }

          if (!response.ok || !body.success) {
            const errorMessage =
              !body.success && body.error
                ? body.error
                : "Failed to join class"

            if (
              !body.success &&
              typeof body.error === "string" &&
              [400, 404, 409].includes(response.status)
            ) {
              form.setError("joinCode", {
                type: "server",
                message: body.error,
              })
            }

            toast.error(errorMessage)
            return
          }

          toast.success("Class joined", {
            description: `${body.classEnrollment.className} — Teacher ${body.classEnrollment.teacherName}`,
          })

          form.reset()
          router.refresh()
        } catch (error) {
          console.error("Unable to join class", error)
          toast.error("Unable to join class", {
            description:
              "Something went wrong. Please check your connection and try again.",
          })
        }
      })
    },
    [form, router]
  )

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {JOIN_CLASS_FIELDS.map(field => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as keyof JoinClassFormValues}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                {field.description ? (
                  <FormDescription>{field.description}</FormDescription>
                ) : null}
                <FormControl>
                  <Input
                    {...formField}
                    type="text"
                    placeholder={field.placeholder}
                    disabled={isPending}
                    onChange={event => {
                      const sanitized = sanitizeJoinCodeInput(
                        event.currentTarget.value
                      )
                      formField.onChange(sanitized)
                    }}
                    value={formField.value ?? ""}
                    {...(field.inputProps as Record<string, unknown>)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Joining..." : "Join Class"}
        </Button>
      </form>
    </Form>
  )
}
