"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  cefrLevel?: string | null;
  level?: number;
  xp?: number;
}

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

export default function EnrollmentManagement({
  classroomId,
  classroomName,
  enrolledStudents: initialEnrolledStudents,
  onStudentEnrolled,
  onStudentUnenrolled,
  refreshStudents,
}: EnrollmentManagementProps) {
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
      toast.error("Failed to load available students");
    } finally {
      setIsLoadingAvailable(false);
    }
  }, [classroomId]);

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
        throw new Error(error.error || "Failed to enroll student");
      }

      const enrolledStudent: EnrolledStudent = { ...student, enrolled: true };
      setEnrolledStudents((prev) => [...prev, enrolledStudent]);
      setAvailableStudents((prev) => prev.filter((s) => s.id !== student.id));

      toast.success(`${student.name} has been enrolled successfully`);
      setIsEnrollDialogOpen(false);
      setSelectedStudent(null);

      onStudentEnrolled?.(student);
      refreshStudents?.();
    } catch (error: any) {
      console.error("Error enrolling student:", error);
      toast.error(error.message || "Failed to enroll student");
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
        throw new Error(error.error || "Failed to unenroll student");
      }

      setEnrolledStudents((prev) => prev.filter((s) => s.id !== student.id));

      // Add back to available students
      const availableStudent: AvailableStudent = {
        ...student,
        enrolled: false,
      };
      setAvailableStudents((prev) => [...prev, availableStudent]);

      toast.success(`${student.name} has been unenrolled successfully`);
      setStudentToUnenroll(null);

      onStudentUnenrolled?.(student.id);
      refreshStudents?.();
    } catch (error: any) {
      console.error("Error unenrolling student:", error);
      toast.error(error.message || "Failed to unenroll student");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Student Enrollment
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage students in {classroomName}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={openEnrollDialog}
            className="w-full sm:w-auto"
            size="sm"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Enroll Student
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Enrolled Students */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enrolled Students ({filteredEnrolledStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEnrolledStudents.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No students match your search"
                  : "No students enrolled yet"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredEnrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback
                          className={`text-white ${getLevelColor(student.level)}`}
                        >
                          {getStudentInitials(student)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {student.name || "No name"}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {student.email}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
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
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStudentToUnenroll(student)}
                      disabled={enrollmentLoading === student.id}
                      className="ml-2 text-red-600 hover:bg-red-50 hover:text-red-700"
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
            <DialogTitle>Enroll Students</DialogTitle>
            <DialogDescription>
              Select students to enroll in {classroomName}
            </DialogDescription>
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
                  {searchTerm
                    ? "No available students match your search"
                    : "No students available for enrollment"}
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
                        {student.name || "No name"}
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
              <AlertCircle className="h-5 w-5 text-red-500" />
              Unenroll Student
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unenroll{" "}
              <span className="font-medium">
                {studentToUnenroll?.name || studentToUnenroll?.email}
              </span>{" "}
              from {classroomName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                studentToUnenroll && handleUnenrollStudent(studentToUnenroll)
              }
              className="bg-red-600 hover:bg-red-700"
              disabled={!!enrollmentLoading}
            >
              {enrollmentLoading === studentToUnenroll?.id ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <UserMinus className="mr-2 h-4 w-4" />
              )}
              Unenroll
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
