"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Users,
  Search,
  MoreVertical,
  UserMinus,
  TrendingUp,
  Calendar,
  GraduationCap,
  Star,
  RotateCcw,
  UserPlus,
  Grid3X3,
  List,
  ChevronLeft,
  Activity,
  Settings,
} from "lucide-react";
import StudentEnrollmentButton from "./student-enrollment-button";
import StudentUnenrollmentButton from "./student-unenrollment-button";
import ClassroomNavigation from "./classroom-navigation";
import StudentCefrLevelSetter from "./student-cefr-level-setter";
import ClassCodeGenerator from "./class-code-generator";
import { getCefrLevelColor } from "@/lib/cefr";

interface StudentData {
  id: string;
  display_name: string | null;
  email: string | null;
  last_activity: string | null;
  level?: number;
  xp?: number;
  cefrLevel?: string | null;
}

interface ClassroomData {
  id: string;
  classroomName: string;
  classCode?: string;
  codeExpiresAt?: string;
  grade?: string;
  teacherId: string;
  archived: boolean;
  student: Array<{
    studentId: string;
    lastActivity: Date;
  }>;
  noOfStudents: number;
  passwordStudents?: string;
}

// type ViewMode = "grid" | "list";

/**
 * Translation function passed into hoisted row components.
 */
type RosterTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/**
 * Derives avatar initials from a student record.
 * @param student Student record.
 * @returns Up to two uppercase initials.
 */
function getStudentInitials(student: StudentData): string {
  if (!student.display_name)
    return student.email?.charAt(0).toUpperCase() || "?";
  return student.display_name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

/**
 * Resolves the level badge colour for a student level.
 * @param level Numeric student level.
 * @returns Tailwind background class.
 */
function getLevelColor(level?: number): string {
  if (!level) return "bg-gray-500";
  if (level <= 10) return "bg-green-500";
  if (level <= 20) return "bg-blue-500";
  if (level <= 30) return "bg-purple-500";
  return "bg-orange-500";
}

/**
 * Formats a last-activity timestamp as relative text.
 * @param lastActivity ISO timestamp, or null when never active.
 * @param t Active translator.
 * @returns Relative activity label.
 */
function formatLastActivity(
  lastActivity: string | null,
  t: RosterTranslator,
): string {
  if (!lastActivity) return t("activity.none");
  const date = new Date(lastActivity);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays === 0) return t("activity.today");
  if (diffInDays === 1) return t("activity.yesterday");
  if (diffInDays < 7) return t("activity.daysAgo", { count: diffInDays });
  if (diffInDays < 30)
    return t("activity.weeksAgo", { count: Math.floor(diffInDays / 7) });
  return date.toLocaleDateString();
}

interface StudentRowProps {
  student: StudentData;
  classroomId: string;
  classroomName: string;
  t: RosterTranslator;
  onViewProgress: (studentId: string) => void;
  onRequestReset: (studentId: string) => void;
  onDataChange: () => void;
}

/**
 * Renders one student row without remounting on parent renders.
 * @param props Student record and row callbacks.
 * @returns The student row card.
 */
function StudentRow({
  student,
  classroomId,
  classroomName,
  t,
  onViewProgress,
  onRequestReset,
  onDataChange,
}: StudentRowProps) {
  const tComponents = useTranslations("Components");
  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="flex-shrink-0">
            <AvatarFallback
              className={`text-white ${getLevelColor(student.level)}`}
            >
              {getStudentInitials(student)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium">
                  {student.display_name || "No name"}
                </h3>
                <p className="truncate text-sm text-gray-500">
                  {student.email}
                </p>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {student.cefrLevel && (
                <Badge
                  variant="secondary"
                  className={`text-xs ${getCefrLevelColor(student.cefrLevel)}`}
                >
                  {student.cefrLevel}
                </Badge>
              )}
              {student.level && (
                <Badge variant="outline" className="text-xs">
                  <GraduationCap className="mr-1 h-3 w-3" />
                  {t("labels.level", { level: student.level })}
                </Badge>
              )}
              {student.xp && (
                <Badge variant="outline" className="text-xs">
                  <Star className="mr-1 h-3 w-3" />
                  {student.xp}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Activity className="h-3 w-3" />
              {formatLastActivity(student.last_activity, t)}
            </div>
            <StudentUnenrollmentButton
              student={{
                id: student.id,
                name: student.display_name,
                email: student.email,
              }}
              classroomId={classroomId}
              classroomName={classroomName}
              onStudentUnenrolled={onDataChange}
              buttonSize="sm"
              buttonVariant="outline"
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label={tComponents("openActionsMenu")}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewProgress(student.id)}>
                  <TrendingUp className="mr-1 h-4 w-4" />
                  {t("actions.viewProgress")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div>
                  <StudentCefrLevelSetter
                    studentId={student.id}
                    studentName={
                      student.display_name || t("labels.studentDefault")
                    }
                    currentCefrLevel={student.cefrLevel || "A0-"}
                    onUpdate={onDataChange}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onRequestReset(student.id)}
                  className="text-orange-600"
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset Progress
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnhancedClassRoster() {
  const router = useRouter();
  const params = useParams();
  const classroomId = params?.classroomId as string;
  const t = useTranslations("Teacher.EnhancedClassRoster");
  const tComponents = useTranslations("Components");

  // State management
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  // const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [loading, setLoading] = useState(true);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch classroom and student data
  const fetchClassroomData = async () => {
    if (!classroomId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/classroom/${classroomId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classroom data");
      }
      const data = await response.json();
      setClassroom(data.classroom);
      setStudents(data.studentInClass || []);
    } catch (error) {
      console.error("Error fetching classroom data:", error);
      toast.error(t("toast.loadClassroomError"));
    } finally {
      setLoading(false);
    }
  };

  // Filter students based on search term
  useEffect(() => {
    const filtered = students.filter(
      (student) =>
        student.display_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredStudents(filtered);
  }, [students, searchTerm]);

  // Initial data fetch
  useEffect(() => {
    fetchClassroomData();
  }, [classroomId]);

  // Handler functions
  const handleResetProgress = async () => {
    if (!selectedStudentId) return;

    setResetLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedStudentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          xp: 0,
          level: 1,
          cefrLevel: "A0",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset progress");
      }

      toast.success(t("toast.resetSuccess"));
      await fetchClassroomData(); // Refresh data
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast.error(t("toast.resetError"));
    } finally {
      setResetLoading(false);
      setResetDialogOpen(false);
      setSelectedStudentId("");
    }
  };

  const handleViewProgress = (studentId: string) => {
    router.push(`/teacher/student-progress/${studentId}`);
  };

  const handleBackToRoster = () => {
    router.push("/teacher/class-roster");
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No classroom found
  if (!classroom) {
    return (
      <div className="py-12 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          {t("notFound.title")}
        </h3>
        <p className="mb-4 text-gray-500">{t("notFound.description")}</p>
        <Button onClick={handleBackToRoster} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          {t("actions.backToRoster")}
        </Button>
      </div>
    );
  }


  //         <div className="min-w-0 flex-1">
  //           <h3 className="truncate font-medium text-gray-900">
  //             {student.display_name || "No name"}
  //           </h3>
  //           <p className="truncate text-sm text-gray-500">{student.email}</p>


  //           <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
  //             <Activity className="h-3 w-3" />
  //             {formatLastActivity(student.last_activity)}
  //           </div>
  //         </div>



  // Student rows render from the module-scope StudentRow below.

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <ClassroomNavigation
        classroom={{
          id: classroom.id,
          name: classroom.classroomName,
          grade: classroom.grade,
          classCode: classroom.classCode,
          passwordStudents: classroom.passwordStudents,
          studentCount: filteredStudents.length,
        }}
      />

      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("students.title")}</h2>
        <div className="flex gap-2">
          <ClassCodeGenerator
            classroomId={classroom.id}
            classroomName={classroom.classroomName}
            currentClassCode={classroom.passwordStudents}
            codeExpiresAt={classroom.codeExpiresAt}
            onCodeGenerated={fetchClassroomData}
            buttonSize="sm"
            buttonVariant="outline"
          />
          <StudentEnrollmentButton
            classroomId={classroom.id}
            classroomName={classroom.classroomName}
            onStudentEnrolled={fetchClassroomData}
            buttonText={t("students.enrollButton")}
            buttonSize="sm"
          />
        </div>
      </div>

      {/* Controls */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("students.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Students Display */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium">
              {searchTerm
                ? t("students.empty.searchTitle")
                : t("students.empty.title")}
            </h3>
            <p className="mb-4 text-gray-500">
              {searchTerm
                ? t("students.empty.searchDescription")
                : t("students.empty.description")}
            </p>
            {!searchTerm && (
              <StudentEnrollmentButton
                classroomId={classroom.id}
                classroomName={classroom.classroomName}
                onStudentEnrolled={fetchClassroomData}
                buttonText={t("students.empty.enrollFirst")}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              classroomId={classroom.id}
              classroomName={classroom.classroomName}
              t={t}
              onViewProgress={handleViewProgress}
              onRequestReset={(studentId) => {
                setSelectedStudentId(studentId);
                setResetDialogOpen(true);
              }}
              onDataChange={fetchClassroomData}
            />
          ))}
        </div>
      )}

      {/* Reset Progress Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("resetDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("resetDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetProgress}
              disabled={resetLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {resetLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              {t("actions.resetProgress")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
