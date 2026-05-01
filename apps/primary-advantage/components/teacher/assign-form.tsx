import React, { useEffect, useState } from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Card } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const formSchema = z.object({
  classroomId: z.string().min(1, "Classroom is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  students: z.array(z.string()).min(1, "Students are required"),
  articleId: z.string(),
  dueDate: z.coerce.date(),
});

interface Student {
  id: string;
  name: string;
}

interface Classroom {
  id: string;
  name: string;
  students: Student[];
}

export default function AssignForm({
  onSave,
  articleId,
  formId,
  onLoadingChange,
}: {
  onSave: () => void;
  articleId: string;
  formId: string;
  onLoadingChange?: (loading: boolean) => void;
}) {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const t = useTranslations("Assignment.assignForm");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classroomId: "",
      name: "",
      description: "",
      students: [],
      articleId: articleId,
      dueDate: new Date(),
    },
  });

  const selectedClassroomId = form.watch("classroomId");

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      onLoadingChange?.(true);

      const res = await fetch("/api/assignments", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit assignment");
      }

      onSave();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit assignment",
        {
          richColors: true,
        },
      );
    } finally {
      onLoadingChange?.(false);
    }
  };

  useEffect(() => {
    async function fetchClassrooms() {
      const res = await fetch("/api/classroom");
      const data = await res.json();
      setClassrooms(data.classrooms);
    }
    fetchClassrooms();
  }, []);

  // Update available students when classroom changes
  useEffect(() => {
    if (selectedClassroomId) {
      const classroom = classrooms.find((c) => c.id === selectedClassroomId);
      if (classroom) {
        setAvailableStudents(classroom.students);
        // Reset selected students when classroom changes
        form.setValue("students", []);
      }
    } else {
      setAvailableStudents([]);
      form.setValue("students", []);
    }
  }, [selectedClassroomId, classrooms, form]);

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="classroomId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("classroom")}</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectedClassroom")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-48">
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="students"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("students")}</FormLabel>
              <FormControl>
                <div className="rounded-md border p-4">
                  {availableStudents.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      {selectedClassroomId
                        ? t("noStudents")
                        : t("pleaseSelectClassroom")}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="mb-3 flex items-center space-x-2">
                        <Checkbox
                          id="select-all"
                          checked={
                            field.value.length === availableStudents.length &&
                            availableStudents.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange(
                                availableStudents.map((s) => s.id),
                              );
                            } else {
                              field.onChange([]);
                            }
                          }}
                        />
                        <label
                          htmlFor="select-all"
                          className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t("selectAllStudents")}
                        </label>
                      </div>
                      <div className="max-h-[200px] space-y-2 overflow-y-auto">
                        {availableStudents.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={student.id}
                              checked={field.value.includes(student.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, student.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter(
                                      (id) => id !== student.id,
                                    ),
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={student.id}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {student.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("dueDate")}</FormLabel>
              <FormDescription className="text-sm">
                {t("selectedDueDate")}
                <span className="font-medium text-green-500">
                  {format(new Date(field.value), "PPP")}
                </span>
              </FormDescription>
              <FormControl>
                <Calendar
                  mode="single"
                  className="w-full rounded-md border p-3"
                  selected={field.value}
                  onSelect={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
