"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, Skeleton } from "@reading-advantage/ui";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getCefrLevelColor } from "@/lib/cefr";
import type { Student } from "@/types";
import { cn } from "@/lib/utils";
import { TEACHER_ACTION } from "./teacher-shell";
import {
  Search,
  UserPlus,
  UserMinus,
  Users,
  X,
  CheckCircle,
  AlertCircle,
  GraduationCap,
  Star,
} from "lucide-react";

interface EnrolledStudent extends Student {
  enrolled: true;
}

interface AvailableStudent extends Student {
  enrolled?: false;
}

interface EnrollmentManagementProps {
  classroomId: string;
  classroomName: string;
  enrolledStudents: EnrolledStudent[];
  onStudentEnrolled?: (student: Student) => void;
  onStudentUnenrolled?: (studentId: string) => void;
  refreshStudents?: () => void;
}

/**
 * Enrollment of one class: search, enroll (a dialog with the students of the school who are not
 * in the class), and the enrolled students as cards with a named remove button.
 * @param props The class, the enrolled students, and the callbacks after a change.
 * @returns The enrollment management body.
 */
export default function EnrollmentManagement({
  classroomId,
  classroomName,
  enrolledStudents: initialEnrolledStudents,
  onStudentEnrolled,
  onStudentUnenrolled,
  refreshStudents,
}: EnrollmentManagementProps) {
  const tc = useTranslations("TeacherClass");
  const t = useTranslations("Teacher.Enrollment");
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>(
    initialEnrolledStudents,
  );
  const [availableStudents, setAvailableStudents] = useState<
    AvailableStudent[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] =
    useState<AvailableStudent | null>(null);
  const [studentToUnenroll, setStudentToUnenroll] =
    useState<EnrolledStudent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [enrollmentLoading, setEnrollmentLoading] = useState<string | null>(
    null,
  );

  // Fetch available students for enrollment
  const fetchAvailableStudents = useCallback(async () => {
    setIsLoadingAvailable(true);
    try {
      const response = await fetch(
        `/api/classroom/${classroomId}/available-students`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch available students");
      }
      const data = await response.json();
      setAvailableStudents(data.students || []);
    } catch (error) {
      console.error("Error fetching available students:", error);
      toast.error(t("toasts.loadAvailableError"));
    } finally {
      setIsLoadingAvailable(false);
    }
  }, [classroomId, t]);

  useEffect(() => {
    setEnrolledStudents(initialEnrolledStudents);
  }, [initialEnrolledStudents]);

  // Filter students based on search term
  const filteredEnrolledStudents = enrolledStudents.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredAvailableStudents = availableStudents.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Enroll a student
  const handleEnrollStudent = async (student: AvailableStudent) => {
    setEnrollmentLoading(student.id);
    try {
      const response = await fetch(`/api/classroom/${classroomId}/enroll`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId: student.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("toasts.enrollError"));
      }

      const enrolledStudent: EnrolledStudent = { ...student, enrolled: true };
      setEnrolledStudents((prev) => [...prev, enrolledStudent]);
      setAvailableStudents((prev) => prev.filter((s) => s.id !== student.id));

      toast.success(t("toasts.enrolled", { name: student.name || t("noName") }));
      setIsEnrollDialogOpen(false);
      setSelectedStudent(null);

      onStudentEnrolled?.(student);
      refreshStudents?.();
    } catch (error: any) {
      console.error("Error enrolling student:", error);
      toast.error(error.message || t("toasts.enrollError"));
    } finally {
      setEnrollmentLoading(null);
    }
  };

  // Unenroll a student
  const handleUnenrollStudent = async (student: EnrolledStudent) => {
    setEnrollmentLoading(student.id);
    try {
      const response = await fetch(`/api/classroom/${classroomId}/unenroll`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId: student.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("toasts.unenrollError"));
      }

      setEnrolledStudents((prev) => prev.filter((s) => s.id !== student.id));

      // Add back to available students
      const availableStudent: AvailableStudent = {
        ...student,
        enrolled: false,
      };
      setAvailableStudents((prev) => [...prev, availableStudent]);

      toast.success(t("toasts.unenrolled", { name: student.name || t("noName") }));
      setStudentToUnenroll(null);

      onStudentUnenrolled?.(student.id);
      refreshStudents?.();
    } catch (error: any) {
      console.error("Error unenrolling student:", error);
      toast.error(error.message || t("toasts.unenrollError"));
    } finally {
      setEnrollmentLoading(null);
    }
  };

  const openEnrollDialog = () => {
    setIsEnrollDialogOpen(true);
    fetchAvailableStudents();
  };

  const getStudentInitials = (student: Student) => {
    if (!student.name) return student.email?.charAt(0).toUpperCase() || "?";
    return student.name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const getLevelColor = (level?: number) => {
    if (!level) return "bg-gray-500";
    if (level <= 10) return "bg-green-500";
    if (level <= 20) return "bg-blue-500";
    if (level <= 30) return "bg-purple-500";
    return "bg-orange-500";
  };



  return (
    <div className="space-y-6">
      {/* Search and enroll (the page heading is in EnrollmentClient). */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            aria-label={tc("searchStudents")}
            placeholder={t("search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-h-11 pl-10"
          />
        </div>
        <Button onClick={openEnrollDialog} className={TEACHER_ACTION}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("enrollButton")}
        </Button>
      </div>

      {/* Enrolled Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("enrolledHeading", { count: filteredEnrolledStudents.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEnrolledStudents.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm ? t("empty.noMatch") : t("empty.none")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEnrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback
                          className={`text-white ${getLevelColor(student.level)}`}
                        >
                          {getStudentInitials(student)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {student.name || t("noName")}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {student.email}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {student.cefrLevel && (
                            <Badge
                              variant="secondary"
                              className={`px-2 py-1 text-xs ${getCefrLevelColor(student.cefrLevel)}`}
                            >
                              {student.cefrLevel}
                            </Badge>
                          )}
                          {student.level && (
                            <Badge
                              variant="outline"
                              className="px-2 py-1 text-xs"
                            >
                              <GraduationCap className="mr-1 h-3 w-3" />
                              {t("levelShort", { level: student.level })}
                            </Badge>
                          )}
                          {student.xp && (
                            <Badge
                              variant="outline"
                              className="px-2 py-1 text-xs"
                            >
                              <Star className="mr-1 h-3 w-3" />
                              {student.xp} XP
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setStudentToUnenroll(student)}
                      disabled={enrollmentLoading === student.id}
                      aria-label={tc("removeFor", { name: student.name || student.email || "" })}
                      className={cn(TEACHER_ACTION, "min-w-11 shrink-0 px-0 text-red-700 hover:bg-red-50 hover:text-red-800")}
                    >
                      {enrollmentLoading === student.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll Student Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description", { classroom: classroomName })}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {isLoadingAvailable ? (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="mb-2 h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredAvailableStudents.length === 0 ? (
              <div className="py-8 text-center">
                <UserPlus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? t("emptyAvailable.noMatch") : t("emptyAvailable.none")}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAvailableStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback
                        className={`text-white ${getLevelColor(student.level)}`}
                      >
                        {getStudentInitials(student)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {student.name || t("noName")}
                      </p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {student.cefrLevel && (
                          <Badge
                            variant="secondary"
                            className={`px-2 py-1 text-xs ${getCefrLevelColor(student.cefrLevel)}`}
                          >
                            {student.cefrLevel}
                          </Badge>
                        )}
                        {student.level && (
                          <Badge
                            variant="outline"
                            className="px-2 py-1 text-xs"
                          >
                            <GraduationCap className="mr-1 h-3 w-3" />
                            Lvl {student.level}
                          </Badge>
                        )}
                        {student.xp && (
                          <Badge
                            variant="outline"
                            className="px-2 py-1 text-xs"
                          >
                            <Star className="mr-1 h-3 w-3" />
                            {student.xp} XP
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedStudent(student);
                        handleEnrollStudent(student);
                      }}
                      disabled={enrollmentLoading === student.id}
                      size="sm"
                    >
                      {enrollmentLoading === student.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Enroll
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEnrollDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unenroll Confirmation Dialog */}
      <AlertDialog
        open={!!studentToUnenroll}
        onOpenChange={() => setStudentToUnenroll(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
              {t("unenroll.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("unenroll.question", {
                student: () => <span className="font-medium">{studentToUnenroll?.name || studentToUnenroll?.email}</span>,
                classroom: () => <span className="font-medium">{classroomName}</span>,
              })}{" "}
              {t("unenroll.cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("unenroll.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                studentToUnenroll && handleUnenrollStudent(studentToUnenroll)
              }
              className="bg-red-600 hover:bg-red-700"
              disabled={!!enrollmentLoading}
            >
              {enrollmentLoading === studentToUnenroll?.id ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              ) : (
                <UserMinus className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {t("unenroll.button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
