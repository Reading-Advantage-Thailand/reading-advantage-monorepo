"use client";

import React, { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Search, UserPlus, GraduationCap, Star } from "lucide-react";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  cefrLevel?: string | null;
  level?: number;
  xp?: number;
}

interface StudentEnrollmentButtonProps {
  classroomId: string;
  classroomName: string;
  onStudentEnrolled?: (student: Student) => void;
  buttonText?: string;
  buttonVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export default function StudentEnrollmentButton({
  classroomId,
  classroomName,
  onStudentEnrolled,
  buttonText = "Enroll Student",
  buttonVariant = "default",
  buttonSize = "default",
  disabled = false,
}: StudentEnrollmentButtonProps) {
  const t = useTranslations("Teacher.StudentEnrollmentButton");
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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
      toast.error(t("toast.loadAvailableError"));
    } finally {
      setIsLoadingAvailable(false);
    }
  }, [classroomId]);

  // Filter students based on search term
  const filteredAvailableStudents = availableStudents.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Enroll a student
  const handleEnrollStudent = async (student: Student) => {
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
        throw new Error(error.error || "Failed to enroll student");
      }

      // Remove from available students
      setAvailableStudents((prev) => prev.filter((s) => s.id !== student.id));

      toast.success(
        t("toast.enrollSuccess", { name: student.name || t("labels.noName") }),
      );
      onStudentEnrolled?.(student);

      // Close dialog if no more students available
      if (filteredAvailableStudents.length <= 1) {
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error enrolling student:", error);
      toast.error(error.message || t("toast.enrollError"));
    } finally {
      setEnrollmentLoading(null);
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      setSearchTerm("");
      fetchAvailableStudents();
    }
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

  const getCefrLevelColor = (cefrLevel?: string | null) => {
    if (!cefrLevel) return "bg-gray-100 text-gray-800";
    const level = cefrLevel.toLowerCase();
    if (level.startsWith("a1")) return "bg-red-100 text-red-800";
    if (level.startsWith("a2")) return "bg-orange-100 text-orange-800";
    if (level.startsWith("b1")) return "bg-yellow-100 text-yellow-800";
    if (level.startsWith("b2")) return "bg-green-100 text-green-800";
    if (level.startsWith("c1")) return "bg-blue-100 text-blue-800";
    if (level.startsWith("c2")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {buttonText || t("actions.open")}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", { classroomName })}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            placeholder={t("search.placeholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Students List */}
        <div className="min-h-[300px] flex-1 overflow-auto">
          {isLoadingAvailable ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
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
            <div className="py-12 text-center">
              <UserPlus className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-lg font-medium text-gray-500">
                {searchTerm ? t("empty.searchTitle") : t("empty.title")}
              </p>
              <p className="text-sm text-gray-400">
                {searchTerm
                  ? t("empty.searchDescription")
                  : t("empty.description")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAvailableStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback
                      className={`text-white ${getLevelColor(student.level)}`}
                    >
                      {getStudentInitials(student)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {student.name || t("labels.noName")}
                    </p>
                    <p className="truncate text-sm text-gray-500">
                      {student.email}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {student.cefrLevel && (
                        <Badge
                          variant="secondary"
                          className={`px-1.5 py-0.5 text-xs ${getCefrLevelColor(student.cefrLevel)}`}
                        >
                          {student.cefrLevel}
                        </Badge>
                      )}
                      {student.level && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0.5 text-xs"
                        >
                          <GraduationCap className="mr-1 h-3 w-3" />
                          {t("labels.level", { level: student.level })}
                        </Badge>
                      )}
                      {student.xp && (
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0.5 text-xs"
                        >
                          <Star className="mr-1 h-3 w-3" />
                          {student.xp}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleEnrollStudent(student)}
                    disabled={enrollmentLoading === student.id}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    {enrollmentLoading === student.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <UserPlus className="mr-1 h-4 w-4" />
                        {t("actions.enroll")}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
            {t("actions.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
