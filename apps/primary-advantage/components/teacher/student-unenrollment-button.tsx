"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserMinus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
}

interface StudentUnenrollmentButtonProps {
  student: Student;
  classroomId: string;
  classroomName: string;
  onStudentUnenrolled?: (studentId: string) => void;
  buttonVariant?:
    | "default"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "destructive";
  buttonSize?: "default" | "sm" | "lg" | "icon";
  showText?: boolean;
  disabled?: boolean;
  /** Accessible name of an icon-only button, for example "Remove Ann from the class". */
  ariaLabel?: string;
  /** Extra classes for the button. */
  className?: string;
}

/**
 * Button that removes a student from a class after a confirmation dialog.
 * @param props The student, the class, the callback after removal, and the button look.
 * @returns The button with its confirmation dialog.
 */
export default function StudentUnenrollmentButton({
  student,
  classroomId,
  classroomName,
  onStudentUnenrolled,
  buttonVariant = "outline",
  buttonSize = "sm",
  showText = false,
  disabled = false,
  ariaLabel,
  className,
}: StudentUnenrollmentButtonProps) {
  const t = useTranslations("Teacher.Enrollment");
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Unenroll a student
  const handleUnenrollStudent = async () => {
    setIsLoading(true);
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

      toast.success(t("toasts.unenrolled", { name: studentDisplayName }));
      onStudentUnenrolled?.(student.id);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error unenrolling student:", error);
      toast.error(error.message || t("toasts.unenrollError"));
    } finally {
      setIsLoading(false);
    }
  };

  const studentDisplayName = student.name || student.email || t("unenroll.unknownStudent");

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "gap-2",
            buttonVariant === "outline" && "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800",
            className,
          )}
        >
          <UserMinus className="h-4 w-4" aria-hidden="true" />
          {showText && t("unenroll.button")}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            {t("unenroll.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            {t.rich("unenroll.question", {
              student: () => <span className="font-bold">{studentDisplayName}</span>,
              classroom: () => <span className="font-bold">{classroomName}</span>,
            })}
            <br />
            <br />
            {t("unenroll.loses")}
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>{t("unenroll.item1")}</li>
              <li>{t("unenroll.item2")}</li>
              <li>{t("unenroll.item3")}</li>
            </ul>
            <br />
            <span className="font-medium text-red-700">{t("unenroll.cannotUndo")}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t("unenroll.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnenrollStudent}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                {t("unenroll.working")}
              </>
            ) : (
              <>
                <UserMinus className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("unenroll.confirm")}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
