"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm, type ControllerRenderProps } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { buildFormFields, type GeneratedFormField, type SelectOption } from "@/lib/forms/from-zod"
import { createClassFormSchema, type CreateClassFormInput } from "@/lib/validations/class"

const GRADE_LEVEL_OPTIONS: SelectOption[] = [
  { label: "Grade 3", value: 3 },
  { label: "Grade 4", value: 4 },
  { label: "Grade 5", value: 5 },
  { label: "Grade 6", value: 6 },
]

const STANDARDS_OPTIONS: SelectOption[] = [
  { label: "Thai National Standards", value: "THAI" },
  { label: "NGSS", value: "NGSS" },
]

const CREATE_CLASS_FIELDS: GeneratedFormField[] = buildFormFields({
  schema: createClassFormSchema,
  overrides: {
    name: {
      label: "Class Name",
      placeholder: "Enter class name",
      order: 1,
    },
    gradeLevel: {
      label: "Grade Level",
      placeholder: "Select grade level",
      type: "select",
      options: GRADE_LEVEL_OPTIONS,
      order: 2,
    },
    standardsAlignment: {
      label: "Standards Alignment",
      placeholder: "Select standards alignment",
      type: "select",
      options: STANDARDS_OPTIONS,
      order: 3,
    },
  },
})

type CreateClassResponse =
  | {
      success: true
      data: {
        id: string
        name: string
        gradeLevel: number
        standardsAlignment: string
        joinCode: string
        createdAt: string
      }
    }
  | {
        success: false
        error: string
        details?: Array<{ field?: string; message: string }>
    }

export function CreateClassForm() {
  const router = useRouter()
  const form = useForm<CreateClassFormInput>({
    resolver: zodResolver(createClassFormSchema),
    defaultValues: {
      name: "",
    } as Partial<CreateClassFormInput>,
  })
  const [isSubmitting, startTransition] = React.useTransition()

  const onSubmit = React.useCallback(
    (values: CreateClassFormInput) => {
      startTransition(async () => {
        try {
          const payload = {
            name: values.name.trim(),
            gradeLevel: values.gradeLevel,
            standardsAlignment: values.standardsAlignment,
          }

          const response = await fetch("/api/classes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })

          const body: CreateClassResponse = await response.json()

          if (!response.ok) {
            if (!body.success) {
              if (body.details && Array.isArray(body.details)) {
                body.details.forEach(detail => {
                  if (detail.field && detail.message) {
                    form.setError(detail.field as keyof CreateClassFormInput, {
                      type: "server",
                      message: detail.message,
                    })
                  }
                })
              }

              toast.error(body.error ?? "Failed to create class")
            } else {
              toast.error("Failed to create class")
            }
            return
          }

          if (body.success) {
            toast.success("Class created", {
              description: `Join code: ${body.data.joinCode}`,
            })
          }

          form.reset()
          router.refresh()
        } catch (error) {
          console.error("Failed to create class", error)
          toast.error("Unable to create class", {
            description: "Please try again. If the issue persists, contact support.",
          })
        }
      })
    },
    [form, router]
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {CREATE_CLASS_FIELDS.map(field => (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as keyof CreateClassFormInput}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FieldControl
                  field={field}
                  formField={formField}
                  disabled={isSubmitting}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Class"}
        </Button>
      </form>
    </Form>
  )
}

type FieldControlProps = {
  field: GeneratedFormField
  formField: ControllerRenderProps<CreateClassFormInput>
  disabled?: boolean
}

function FieldControl({ field, formField, disabled }: FieldControlProps) {
  const baseType = field.meta.baseType

  if (field.type === "select" && field.options) {
    return (
      <FormControl>
        <Select
          onValueChange={value => {
            const nextValue =
              baseType instanceof z.ZodNumber ? Number(value) : value
            formField.onChange(nextValue)
          }}
          value={
            formField.value === undefined || formField.value === null
              ? ""
              : String(formField.value)
          }
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`}
            />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(option => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
    )
  }

  const inputType = field.type === "number" ? "number" : "text"

  return (
    <FormControl>
      <Input
        {...formField}
        type={inputType}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={event => {
          const rawValue = event.target.value;
          const nextValue =
            baseType instanceof z.ZodNumber
              ? rawValue === '' ? undefined : Number(rawValue)
              : rawValue;

          formField.onChange(nextValue);
        }}
      />
    </FormControl>
  )
}
