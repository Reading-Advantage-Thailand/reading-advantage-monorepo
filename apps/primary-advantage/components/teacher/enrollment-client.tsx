"use client";

import React, { useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { EmptyState, ShimmerSkeleton } from "@reading-advantage/ui";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import EnrollmentManagement from "@/components/teacher/enrollment-management";
import {
  adaptClassroomPayload,
  type EnrollmentClassroom,
} from "@/components/teacher/enrollment-classroom";
import { TEACHER_ACTION, TEACHER_BACK_LINK, TeacherPageHeader } from "./teacher-shell";

/**
 * Interactive enrollment page. Renders the server-fetched classroom and
 * refetches from the API only after user actions (enroll, unenroll).
 * @param classroomId The classroom identifier.
 * @param initialClassroom The classroom fetched on the server page, or null.
 * @returns The enrollment management UI.
 */
export default function EnrollmentClient({
  classroomId,
  initialClassroom,
}: {
  classroomId: string;
  initialClassroom: EnrollmentClassroom | null;
}) {
  const t = useTranslations("Teacher.Enrollment");

  const [classroom, setClassroom] = useState<EnrollmentClassroom | null>(
    initialClassroom,
  );
  const [refreshing, setRefreshing] = useState(false);

  const fetchClassroom = async () => {
    try {
      setRefreshing(true);
      const response = await fetch(`/api/classroom/${classroomId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classroom");
      }
      const data = await response.json();
      setClassroom(adaptClassroomPayload(data));
    } catch (error) {
      console.error("Error fetching classroom:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setRefreshing(false);
    }
  };

  const backHref = `/teacher/class-roster/${classroomId}`;

  if (refreshing && !classroom) {
    return (
      <div aria-busy="true" className="flex flex-col gap-4">
        <ShimmerSkeleton className="h-8 w-56" />
        <ShimmerSkeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <EmptyState
        className="bg-card border"
        titleAs="h1"
        icon={<Users />}
        title={t("notFound.title")}
        description={t("notFound.description")}
        action={
          <Link href={backHref} className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION, "px-5")}>
            <ArrowLeft aria-hidden="true" />
            {t("actions.back")}
          </Link>
        }
      />
    );
  }

  const enrolledStudents = classroom.students.map((cs) => ({
    ...cs.student,
    enrolled: true as const,
  }));

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        back={
          <Link href={backHref} className={TEACHER_BACK_LINK}>
            <ArrowLeft aria-hidden="true" />
            {t("actions.backToRoster")}
          </Link>
        }
        title={t("header.title")}
        description={
          <>
            {t("header.subtitle")} <span className="text-foreground font-medium">{classroom.name}</span>
          </>
        }
      />

      <EnrollmentManagement
        classroomId={classroom.id}
        classroomName={classroom.name}
        enrolledStudents={enrolledStudents}
        onStudentEnrolled={fetchClassroom}
        onStudentUnenrolled={fetchClassroom}
        refreshStudents={fetchClassroom}
      />
    </div>
  );
}
