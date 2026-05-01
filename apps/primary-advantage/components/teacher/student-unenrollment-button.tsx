"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { UserMinus, AlertCircle } from "lucide-react";

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
}

export default function StudentUnenrollmentButton({
  student,
  classroomId,
  classroomName,
  onStudentUnenrolled,
  buttonVariant = "outline",
  buttonSize = "sm",
  showText = false,
  disabled = false,
}: StudentUnenrollmentButtonProps) {
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
        throw new Error(error.error || "Failed to unenroll student");
      }

      toast.success(
        `${student.name || student.email} has been unenrolled successfully`,
      );
      onStudentUnenrolled?.(student.id);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error unenrolling student:", error);
      toast.error(error.message || "Failed to unenroll student");
    } finally {
      setIsLoading(false);
    }
  };

  const studentDisplayName = student.name || student.email || "Unknown Student";

  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled}
          className={`gap-2 ${buttonVariant === "outline" ? "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" : ""}`}
        >
          <UserMinus className="h-4 w-4" />
          {showText && "Unenroll"}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Unenroll Student
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left">
            Are you sure you want to unenroll{" "}
            <span className="font-bold">{studentDisplayName}</span> from{" "}
            <span className="font-bold">{classroomName}</span>?
            <br />
            <br />
            This will remove the student from the classroom and they will lose
            access to:
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
              <li>Classroom assignments and activities</li>
              <li>Progress tracking for this class</li>
              <li>Class-specific content and materials</li>
            </ul>
            <br />
            <span className="font-medium text-red-600">
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUnenrollStudent}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isLoading ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Unenrolling...
              </>
            ) : (
              <>
                <UserMinus className="mr-2 h-4 w-4" />
                Unenroll Student
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
