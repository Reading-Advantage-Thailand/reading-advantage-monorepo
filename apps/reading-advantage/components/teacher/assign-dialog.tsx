"use client";
import React, { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Article } from "@/components/models/article-model";
import { toast } from "../ui/use-toast";
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
import { buttonVariants } from "@/components/ui/button";
import { useScopedI18n } from "@/locales/client";
import { Skeleton } from "@/components/ui/skeleton";

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
  classroomName: string;
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
    }
  ];
  importedFromGoogle: boolean;
  alternateLink: string;
  googleClassroomId: string;
}

export default function AssignDialog({
  article,
  articleId,
  userId,
  pageType,
  classroomId,
  onUpdate,
}: Props) {
  const [classrooms, setClassrooms] = useState<Classes[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(false);
  const t = useScopedI18n("pages.teacher.AssignmentPage");
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [form, setForm] = useState({
    classroomId: "",
    title: "",
    description: "",
    dueDate: "",
  });

  useEffect(() => {
    if (pageType === "assignment" && classroomId) {
      setForm((prev) => ({
        ...prev,
        classroomId: classroomId,
      }));
    }
  }, [pageType, classroomId]);

  useEffect(() => {
    if (!isOpen) return;
    async function fetchCourses() {
      try {
        const res = await fetch("/api/v1/classroom");
        const data = await res.json();
        setClassrooms(data.data);
      } catch (error) {
        console.error("Error fetching courses:", error);
        toast({
          title: "Error",
          description: "Failed to fetch courses",
          variant: "destructive",
        });
      }
    }
    fetchCourses();
  }, [isOpen, setClassrooms]);

  useEffect(() => {
    if (!form.classroomId || !articleId || !isOpen) {
      return;
    }

    // เฉพาะเมื่อ classroomId หรือ articleId เปลี่ยน หรือเป็นการโหลดครั้งแรก
    async function checkExistingAssignment() {
      setLoadingStudents(true);
      try {
        const res = await fetch(
          `/api/v1/assignments?classroomId=${form.classroomId}&articleId=${articleId}`
        );
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const assignments = await res.json();

        if (assignments.meta) {
          setForm((prev) => ({
            ...prev,
            title: assignments.meta.title,
            description: assignments.meta.description,
            dueDate: assignments.meta.dueDate,
          }));

          const dueDate = new Date(assignments.meta.dueDate);
          if (!isNaN(dueDate.getTime())) {
            setDate(dueDate);
          }
          const studentIdsFromServer = assignments.students.map(
            (student: any) => student.studentId
          );
          setSelectedStudents(studentIdsFromServer);
          setAssignedStudentIds(studentIdsFromServer);
        } else if (isInitialLoad) {
          setForm((prev) => ({
            ...prev,
            title: "",
            description: "",
          }));
          setSelectedStudents([]);
          setAssignedStudentIds([]);
        }
        setLoadingStudents(false);
        setIsInitialLoad(false);
      } catch (error) {
        console.error("Error fetching assignments:", error);
        if (isInitialLoad) {
          setSelectedStudents([]);
          setAssignedStudentIds([]);
          setForm((prev) => ({
            ...prev,
            title: "",
            description: "",
          }));
        }
        setIsInitialLoad(false);
      }
    }

    checkExistingAssignment();
  }, [form.classroomId, articleId]);

  useEffect(() => {
    async function fetchStudents() {
      if (!form.classroomId || !isOpen) {
        setStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        const res = await fetch(`/api/v1/classroom/${form.classroomId}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        const studentsData = data.studentInClass || data.data?.studentInClass || [];
        // Map the student data to match the expected format
        const mappedStudents = studentsData.map((student: any) => ({
          id: student.id,
          display_name: student.display_name || student.name || student.email,
        }));
        setStudents(mappedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error",
          description: "Failed to fetch students for this classroom",
          variant: "destructive",
        });
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchStudents();
  }, [form.classroomId]);

  useEffect(() => {
    if (errors.selectedStudents && selectedStudents.length > 0) {
      setErrors((prev) => ({ ...prev, selectedStudents: "" }));
    }
  }, [selectedStudents.length, errors.selectedStudents]);

  // Handle form input changes
  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  // Handle student selection
  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
    // Clear students error when selecting
    if (errors.selectedStudents) {
      setErrors((prev) => ({ ...prev, selectedStudents: "" }));
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.classroomId) {
      newErrors.classroomId = `${t("error.pleaseSelectClass")}`;
    }

    if (!form.title || !form.title.trim()) {
      newErrors.title = `${t("error.titleRequired")}`;
    }

    if (!form.description || !form.description.trim()) {
      newErrors.description = `${t("error.descriptionRequired")}`;
    }

    if (!date) {
      newErrors.dueDate = `${t("error.dueDateRequired")}`;
    }

    if (selectedStudents.length === 0) {
      newErrors.selectedStudents = `${t("error.selectAtLeastOneStudent")}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit function
  const onSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: `${t("toast.validationError")}`,
        description: `${t("toast.fixErrorsAndTryAgain")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const assignmentData: AssignmentFormData = {
        ...form,
        selectedStudents,
        articleId,
        userId,
        dueDate: date!.toISOString(),
      };

      // แยก student ใหม่กับที่มีอยู่แล้ว
      const newStudents = selectedStudents.filter(
        (id) => !assignedStudentIds.includes(id)
      );
      const removedStudents = assignedStudentIds.filter(
        (id) => !selectedStudents.includes(id)
      );

      // POST สำหรับ student ใหม่
      if (newStudents.length > 0) {
        const response = await fetch("/api/v1/assignments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...assignmentData,
            selectedStudents: newStudents,
          }),
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error("POST Error:", response.status, errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      // PUT สำหรับ meta (ข้อมูลหลักของ assignment)
      if (assignedStudentIds.length > 0) {
        const metaResponse = await fetch("/api/v1/assignments", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classroomId: form.classroomId,
            articleId,
            studentId: "meta",
            updates: {
              title: form.title,
              description: form.description,
              dueDate: date!.toISOString(),
            },
          }),
        });

        if (!metaResponse.ok) {
          const errorText = await metaResponse.text();
          console.error("META PUT Error:", metaResponse.status, errorText);
          throw new Error(`HTTP error! status: ${metaResponse.status}`);
        }
      }

      // DELETE สำหรับ students ที่ถูกลบออกจาก assignment
      for (const studentId of removedStudents) {
        const response = await fetch("/api/v1/assignments", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classroomId: form.classroomId,
            articleId,
            studentId,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`DELETE Error for student ${studentId}:`, response.status, errorText);
          // ไม่ throw error เพราะอาจจะไม่มี assignment อยู่แล้ว
        }
      }

      toast({
        title: `${t("toast.success")}`,
        description: assignedStudentIds.length > 0 
          ? `Assignment "${form.title}" updated successfully` 
          : `${t("toast.assignmentCreated", { title: form.title })}`,
      });

      onUpdate?.();
      handleReset();
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating/updating assignment:", error);
      toast({
        title: `${t("toast.error")}`,
        description: assignedStudentIds.length > 0 
          ? "Failed to update assignment"
          : `${t("toast.creationFailed")}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm((prev) => ({
      classroomId:
        pageType === "assignment" && classroomId
          ? classroomId
          : prev.classroomId || "",
      title: "",
      description: "",
      dueDate: "",
    }));
    setDate(new Date());
    setSelectedStudents([]);
    setStudents([]);
    setErrors({});
    setIsInitialLoad(true);
  };

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            {pageType === "assignment"
              ? `${t("editAssignment")}`
              : `${t("assignment")}`}
          </Button>
        </DialogTrigger>
        <DialogContent className="z-50 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createAssignment")}</DialogTitle>
            <DialogDescription>
              {t("createAssignmentDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Article Info */}
          <div className="mb-4 rounded-lg">
            <h3 className="font-semibold text-lg">
              {article?.title || "The Great Gatsby"}
            </h3>
            <p className="text-sm text-gray-600">
              {article?.summary || "A novel by F. Scott Fitzgerald"}
            </p>
          </div>

          {/* Class Selection */}
          {pageType !== "assignment" && (
            <div>
              <Label className="text-sm font-medium">{t("classroom")} *</Label>
              {classrooms.length === 0 ? (
                <Skeleton className="h-10 w-full mt-1" />
              ) : (
                <Select
                  onValueChange={(value) => handleChange("classroomId", value)}
                  value={form.classroomId}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full mt-1",
                      errors.classroomId && "border-red-500"
                    )}
                  >
                    <SelectValue placeholder={`${t("selectClass")}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id!}>
                        {classroom.classroomName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.classroomId && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.classroomId}
                </p>
              )}
            </div>
          )}

          {pageType === "assignment" && (
            <div>
              <Label className="text-sm font-medium">{t("classroom")}</Label>
              <div className="mt-1 p-2 rounded-md border">
                {classrooms.length === 0 ? (
                  <Skeleton className="h-4 w-24" />
                ) : (
                  <span className="text-sm">
                    {classrooms.find((c) => c.id === form.classroomId)
                      ?.classroomName || "Loading..."}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Assignment Title */}
            <div>
              <Label className="text-sm font-medium">
                {t("assignmentTitle")} *
              </Label>
              <Input
                placeholder={`${t("enterAssignmentTitle")}`}
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={cn("mt-1", errors.title && "border-red-500")}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Assignment Description */}
            <div>
              <Label className="text-sm font-medium">
                {t("description")} *
              </Label>
              <Textarea
                placeholder={`${t("enterAssignmentDescription")}`}
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={cn("mt-1", errors.description && "border-red-500")}
                rows={3}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Students Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">{t("students")} *</Label>
                {students.length > 0 &&
                  students.some((s) => !assignedStudentIds.includes(s.id)) &&
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
                          (s) => !assignedStudentIds.includes(s.id)
                        );
                        const availableStudentIds = availableStudents.map(
                          (s) => s.id
                        );
                        if (
                          availableStudentIds.every((id) =>
                            selectedStudents.includes(id)
                          )
                        ) {
                          setSelectedStudents(
                            selectedStudents.filter((id) =>
                              assignedStudentIds.includes(id)
                            )
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
                        ? `${t("deselectAllStudents")}`
                        : `${t("selectAllStudents")}`}
                    </button>
                  )}
              </div>

              <div
                className={cn(
                  "space-y-2 max-h-32 overflow-y-auto border rounded-md p-3",
                  errors.selectedStudents && "border-red-500"
                )}
              >
                {loadingStudents ? (
                  <div className="space-y-2">
                    {/* Skeleton Loading for Students */}
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    ))}
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      {form.classroomId
                        ? `${t("noStudentsFound")}`
                        : `${t("pleaseSelectClassroomFirst")}`}
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
                        className="text-sm font-normal cursor-pointer"
                      >
                        {student.display_name || student.name || student.id}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {errors.selectedStudents && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.selectedStudents}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {t("selectedStudentsCount", {
                  studentsCount: selectedStudents.length,
                })}
              </p>
            </div>

            {/* Due Date */}
            <div>
              <Label className="text-sm font-medium">{t("dueDate")} *</Label>
              {date && !isNaN(date.getTime()) && (
                <p className="text-sm text-gray-600 mb-2">
                  {t("selectedDueDate")}:{" "}
                  <span className="font-medium text-green-600">
                    {format(date, "PPP")}
                  </span>
                </p>
              )}
              <div
                className={cn(
                  "mt-2",
                  errors.dueDate && "border-red-500 rounded-md"
                )}
              >
                <div className="flex items-center justify-center border rounded-md p-3">
                  <Calendar
                    mode="single"
                    classNames={{
                      months:
                        "flex flex-col sm:flex-row w-full space-y-4 sm:space-x-4 sm:space-y-0",
                      month: "space-y-4 w-full",
                      table: "w-full border-collapse",
                      day: cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-12 w-12 sm:w-16 sm:h-18 p-0 font-normal aria-selected:opacity-100"
                      ),
                      head_cell:
                        "text-muted-foreground rounded-md w-12 sm:w-16 font-normal text-[0.8rem]",
                    }}
                    selected={date}
                    onSelect={(selectedDate) => {
                      if (!selectedDate) return;
                      setDate(selectedDate);
                      handleChange(
                        "dueDate",
                        selectedDate.toISOString().split("T")[0]
                      );
                    }}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </div>
              </div>
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                handleReset();
                setIsOpen(false);
              }}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? assignedStudentIds.length > 0 
                  ? "Updating..." 
                  : `${t("creating")}`
                : assignedStudentIds.length > 0
                ? `${t("editAssignment")}`
                : `${t("createAssignmentButton")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
