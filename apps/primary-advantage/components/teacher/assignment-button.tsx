"use client";
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Article } from "@/types";
import { ClipboardCheckIcon } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";

type Props = {
  article: Article;
  articleId: string;
  userId: string;
  pageType?: "assignment" | "article";
  classroomId?: string;
  onUpdate?: () => void;
};

// Student interface
interface Student {
  id: string;
  display_name?: string;
  name?: string;
}

interface AssignmentFormData {
  classroomId: string;
  title: string;
  description: string;
  dueDate: string;
  selectedStudents: string[];
  articleId: string;
  userId: string;
}

interface Classes {
  name: string;
  classCode: string;
  noOfStudents: number;
  grade: string;
  coTeacher: {
    coTeacherId: string;
    name: string;
  };
  id: string;
  archived: boolean;
  title: string;
  student: [
    {
      studentId: string;
      lastActivity: Date;
    },
  ];
  importedFromGoogle: boolean;
  alternateLink: string;
  googleClassroomId: string;
}

const formSchema = z.object({
  classroomId: z.string().min(1, "Classroom is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  selectedStudents: z.array(z.string()).min(1, "Students are required"),
  articleId: z.string().min(1, "Article is required"),
  dueDate: z.coerce.date(),
});

export default function AssignmentButton({
  article,
  articleId,
  userId,
  pageType,
  classroomId,
  onUpdate,
}: Props) {
  const [classrooms, setClassrooms] = useState<Classes[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classroomId: "",
      name: "",
      description: "",
      selectedStudents: [],
      articleId: articleId,
      dueDate: new Date(),
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to create assignment");
      }
      toast.success("Assignment created successfully!");
      form.reset();
      setIsOpen(false);
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast.error("Error", {
        description: "Failed to submit assignment",
        richColors: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    async function fetchCourses() {
      try {
        const res = await fetch("/api/classroom");
        const data = await res.json();
        setClassrooms(data.classrooms);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast.error("Error", {
          description: "Failed to fetch courses",
          richColors: true,
        });
      }
    }
    fetchCourses();
  }, []);

  useEffect(() => {
    async function fetchStudents() {
      if (!form.getValues("classroomId")) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        const res = await fetch(
          `/api/classroom/${form.getValues("classroomId")}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const studentsData =
          data.studentInClass || data.data?.studentInClass || [];
        // Map the student data to match the expected format
        const mappedStudents = studentsData.map((student: any) => ({
          id: student.id,
          display_name: student.display_name || student.name || student.email,
        }));
        setStudents(mappedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Error", {
          description: "Failed to fetch students for this classroom",
          richColors: true,
        });
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchStudents();
  }, [form.watch("classroomId")]);

  useEffect(() => {
    if (errors.selectedStudents && selectedStudents.length > 0) {
      setErrors((prev) => ({ ...prev, selectedStudents: "" }));
    }
  }, [selectedStudents.length, errors.selectedStudents]);

  // Handle student selection
  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
    // Clear students error when selecting
    if (errors.selectedStudents) {
      setErrors((prev) => ({ ...prev, selectedStudents: "" }));
    }
  };

  return (
    <Form {...form}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <DialogTrigger asChild>
            <Button>
              <ClipboardCheckIcon />
              Assignment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <div className="flex max-h-[80vh] flex-col gap-4">
              <DialogHeader>
                <DialogTitle>Create Assignment</DialogTitle>
                <DialogDescription>
                  Create an assignment for your students
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto">
                {/* Article Info */}
                <div>
                  <h3 className="text-lg font-semibold">{article?.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {article?.summary}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="classroomId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Classroom</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Classroom" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {classrooms.map((classroom) => (
                              <SelectItem
                                key={classroom.id}
                                value={classroom.id!}
                              >
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
                      <FormLabel>Assignment Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter an Assignment Name"
                          {...field}
                        />
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
                      <FormLabel>Assignment Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter an Assignment Description"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  {/* Students Selection */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      {/* <Label className="text-sm font-medium">{t("students")} *</Label> */}
                      <Label className="text-sm font-medium">Students *</Label>
                      {students.length > 0 &&
                        students.some(
                          (s) => !assignedStudentIds.includes(s.id),
                        ) &&
                        !loadingStudents && (
                          <button
                            type="button"
                            className={`${
                              selectedStudents.length === students.length
                                ? `text-red-600`
                                : `text-blue-600`
                            } text-sm underline hover:no-underline`}
                            onClick={() => {
                              const availableStudents = students.filter(
                                (s) => !assignedStudentIds.includes(s.id),
                              );
                              const availableStudentIds = availableStudents.map(
                                (s) => s.id,
                              );
                              if (
                                availableStudentIds.every((id) =>
                                  selectedStudents.includes(id),
                                )
                              ) {
                                setSelectedStudents(
                                  selectedStudents.filter((id) =>
                                    assignedStudentIds.includes(id),
                                  ),
                                );
                              } else {
                                setSelectedStudents([
                                  ...new Set([
                                    ...selectedStudents,
                                    ...availableStudentIds,
                                  ]),
                                ]);
                                setErrors((prev) => ({
                                  ...prev,
                                  selectedStudents: "",
                                }));
                              }
                            }}
                            disabled={loadingStudents}
                          >
                            {students
                              .filter((s) => !assignedStudentIds.includes(s.id))
                              .every((s) => selectedStudents.includes(s.id))
                              ? `Deselect All Students`
                              : `Select All Students`}
                          </button>
                        )}
                    </div>

                    <div
                      className={cn(
                        "max-h-32 space-y-2 overflow-y-auto rounded-md border p-3",
                        errors.selectedStudents && "border-red-500",
                      )}
                    >
                      {loadingStudents ? (
                        <div className="space-y-2">
                          {/* Skeleton Loading for Students */}
                          {Array.from({ length: 5 }).map((_, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2"
                            >
                              <Skeleton className="h-4 w-4 rounded" />
                              <Skeleton className="h-4 w-32" />
                            </div>
                          ))}
                        </div>
                      ) : students.length === 0 ? (
                        <div className="py-4 text-center">
                          <p className="text-sm text-gray-500">
                            {form.getValues("classroomId")
                              ? `No students found`
                              : `Please select a classroom first`}

                            {/* {form.classroomId
                        ? `${t("noStudentsFound")}`
                        : `${t("pleaseSelectClassroomFirst")}`} */}
                          </p>
                        </div>
                      ) : (
                        students.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={student.id}
                              checked={selectedStudents.includes(student.id)}
                              disabled={assignedStudentIds.includes(student.id)}
                              onCheckedChange={() => {
                                if (!assignedStudentIds.includes(student.id)) {
                                  handleStudentToggle(student.id);
                                }
                              }}
                            />
                            <Label
                              htmlFor={student.id}
                              className="cursor-pointer text-sm font-normal"
                            >
                              {student.display_name ||
                                student.name ||
                                student.id}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
                    {errors.selectedStudents && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.selectedStudents}
                      </p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Selected Students: {selectedStudents.length}
                    </p>
                  </div>

                  {/* Due Date */}
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormDescription>
                          {field.value &&
                            !isNaN(new Date(field.value).getTime()) && (
                              <p className="text-sm">
                                Selected Due Date:{" "}
                                <span className="font-medium text-green-500">
                                  {format(new Date(field.value), "PPP")}
                                </span>
                              </p>
                            )}
                        </FormDescription>
                        <FormControl>
                          <Calendar
                            mode="single"
                            className="w-full rounded-md border p-3"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setIsOpen(false);
                  }}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? assignedStudentIds.length > 0
                      ? "Updating..."
                      : `Creating...`
                    : assignedStudentIds.length > 0
                      ? `Edit Assignment`
                      : `Create Assignment`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </form>
      </Dialog>
    </Form>
  );
}
