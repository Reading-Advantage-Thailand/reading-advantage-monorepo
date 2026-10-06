"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Calendar, Check, Edit3, Trash2, TriangleAlertIcon, Users, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, ErrorState, ShimmerSkeleton, StatusChip } from "@reading-advantage/ui";
import { getDueDateStatus } from "@reading-advantage/domain/assignments/due-date";
import { SCHOOL_TIME_ZONE } from "@reading-advantage/domain/calendar-day";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DueChip } from "./due-chip";
import { TEACHER_ACTION, TEACHER_BACK_LINK, TEACHER_CARD, TeacherPageHeader } from "./teacher-shell";

/** One student of the assignment. Status: 0 not started, 1 in progress, 2 completed. */
interface Student {
  id: string;
  studentId: string;
  status: number;
  displayName: string;
}

/** The assignment, as `/api/assignments?id=` returns it. */
type Assignment = {
  meta: {
    id: string;
    title: string;
    description: string;
    /** Null when the assignment has no due date (the column is nullable). */
    dueDate: string | null;
    classroomId: string;
    articleId: string;
    userId: string;
    createdAt: string;
    articleTitle: string;
  };
  students: Student[];
};

/** The student filter: all, a status number ("0", "1", "2"), or overdue. */
type Filter = "all" | "0" | "1" | "2" | "overdue";

/** Chip tone of each student status. */
const STATUS_TONE: Record<number, "neutral" | "info" | "success"> = { 0: "neutral", 1: "info", 2: "success" };

/** Shimmer blocks in the shape of the page. */
function AssignmentSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <ShimmerSkeleton className="h-5 w-40" />
      <ShimmerSkeleton className="h-9 w-64 max-w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <ShimmerSkeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <ShimmerSkeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Teacher assignment page: a link back to the list, the assignment title (h1) and its story, the
 * created and due dates on the Bangkok calendar with a due chip, count tiles, the class progress,
 * and the student cards with status filters (toggle buttons that wrap on a phone). In edit mode
 * the teacher selects students and removes the assignment from them. Loading shows shimmer
 * blocks; a failed load shows an error with a retry.
 * @returns The assignment page.
 */
export default function AssignmentDashboard() {
  const t = useTranslations("Teacher.AssignmentDashboard");
  const ta = useTranslations("TeacherAssignments");
  const te = useTranslations("Error");
  const locale = useLocale();
  const params = useParams();
  const assignmentId = params.id as string;
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [filterStatus, setFilterStatus] = useState<Filter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAssignment = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await fetch(`/api/assignments?id=${assignmentId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch assignment");
      }
      setAssignment(await response.json());
    } catch (error) {
      console.error("Error fetching assignment:", error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void loadAssignment();
  }, [loadAssignment]);

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
    setSelectedStudents([]);
  };

  const handleStudentSelect = (id: string) => {
    setSelectedStudents((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  };

  const handleDeleteStudents = async () => {
    if (!assignment || selectedStudents.length === 0) return;
    // The selection holds student-assignment ids; the API takes student ids.
    const studentIds = selectedStudents
      .map((id) => assignment.students.find((student) => student.id === id)?.studentId)
      .filter(Boolean) as string[];
    if (studentIds.length === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch("/api/v1/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId: assignment.meta.classroomId,
          articleId: assignment.meta.articleId,
          studentIds,
        }),
      });
      if (response.ok) {
        await loadAssignment();
        setSelectedStudents([]);
        setIsEditMode(false);
      } else {
        console.error("Failed to delete students:", await response.json());
      }
    } catch (error) {
      console.error("Error deleting students:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (value: string): string =>
    // The school time zone: the server (UTC) and the browser write the same day.
    new Date(value).toLocaleDateString(locale, {
      timeZone: SCHOOL_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const back = (
    <Link href="/teacher/assignments" className={TEACHER_BACK_LINK}>
      <ArrowLeft aria-hidden="true" />
      {ta("backToAssignments")}
    </Link>
  );

  if (isLoading && !assignment) return <AssignmentSkeleton />;

  if (loadError || !assignment) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <ErrorState
          className="bg-card border"
          icon={<TriangleAlertIcon />}
          title={ta("loadOneError")}
          description={ta("loadErrorHint")}
          action={
            <Button type="button" className={cn(TEACHER_ACTION, "px-6")} onClick={() => void loadAssignment()}>
              {te("retry")}
            </Button>
          }
        />
      </div>
    );
  }

  // A null due date is "none": never "Overdue" and never shown as 1 January 1970.
  const dueStatus = getDueDateStatus(assignment.meta.dueDate);
  const isPastDue = dueStatus.kind === "overdue";
  const students = assignment.students;
  const isOverdue = (student: Student) => student.status !== 2 && isPastDue;
  const count = (status: number) => students.filter((student) => student.status === status).length;
  const stats = {
    total: students.length,
    notStarted: count(0),
    inProgress: count(1),
    completed: count(2),
    overdue: students.filter(isOverdue).length,
  };
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const filteredStudents =
    filterStatus === "all"
      ? students
      : filterStatus === "overdue"
        ? students.filter(isOverdue)
        : students.filter((student) => student.status === Number(filterStatus));
  const statusLabel = (status: number) =>
    status === 0 ? t("notStarted") : status === 1 ? t("inProgress") : status === 2 ? t("completed") : t("unknownStatus");

  const tiles: { label: string; value: number; tone: string }[] = [
    { label: t("allStudents"), value: stats.total, tone: "text-primary" },
    { label: t("notStarted"), value: stats.notStarted, tone: "text-foreground" },
    { label: t("inProgress"), value: stats.inProgress, tone: "text-primary" },
    { label: t("completed"), value: stats.completed, tone: "text-green-700 dark:text-green-400" },
    { label: t("overdue"), value: stats.overdue, tone: "text-destructive" },
  ];
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: t("all"), count: stats.total },
    { value: "0", label: t("notStarted"), count: stats.notStarted },
    { value: "1", label: t("inProgress"), count: stats.inProgress },
    { value: "2", label: t("completed"), count: stats.completed },
    { value: "overdue", label: t("overdue"), count: stats.overdue },
  ];

  return (
    <div className="flex flex-col gap-6">
      <TeacherPageHeader
        back={back}
        title={assignment.meta.title}
        description={
          <>
            {ta("story")}: <span className="text-foreground font-medium">{assignment.meta.articleTitle}</span>
          </>
        }
      />

      <section className={TEACHER_CARD}>
        {assignment.meta.description ? <p className="break-words">{assignment.meta.description}</p> : null}
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {assignment.meta.createdAt ? (
            <span className="inline-flex items-center gap-2">
              <Calendar className="size-4" aria-hidden="true" />
              {t("createdOn")}: {formatDate(assignment.meta.createdAt)}
            </span>
          ) : null}
          <span>
            {t("dueDate")}:{" "}
            {assignment.meta.dueDate && dueStatus.kind !== "none" ? formatDate(assignment.meta.dueDate) : t("noDueDate")}
          </span>
          {dueStatus.kind !== "none" ? <DueChip dueDate={assignment.meta.dueDate} /> : null}
        </div>
      </section>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <li key={tile.label} className="bg-card flex min-w-0 flex-col gap-1 rounded-2xl border p-4 shadow-sm">
            <span className="text-muted-foreground text-sm font-medium break-words">{tile.label}</span>
            <span className={cn("text-2xl font-bold", tile.tone)}>{tile.value}</span>
          </li>
        ))}
      </ul>

      <section className={TEACHER_CARD} aria-labelledby="assignment-progress-heading">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="assignment-progress-heading" className="text-lg font-semibold">
            {t("overallProgress")}
          </h2>
          <span className="text-primary text-lg font-bold">{ta("progressLabel", { percent: completionRate })}</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="assignment-progress-heading"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={completionRate}
          className="bg-muted h-3 w-full rounded-full"
        >
          <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
        </div>
      </section>

      <section className={TEACHER_CARD} aria-labelledby="assignment-students-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="assignment-students-heading" className="text-lg font-semibold">
            {t("studentList")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {isEditMode ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  className={TEACHER_ACTION}
                  onClick={() => void handleDeleteStudents()}
                  disabled={selectedStudents.length === 0 || isDeleting}
                >
                  <Trash2 aria-hidden="true" />
                  {isDeleting ? t("deleting") : t("deleteCount", { count: selectedStudents.length })}
                </Button>
                <Button type="button" variant="outline" className={TEACHER_ACTION} onClick={handleEditToggle}>
                  <X aria-hidden="true" />
                  {t("cancel")}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" className={TEACHER_ACTION} onClick={handleEditToggle}>
                <Edit3 aria-hidden="true" />
                {t("edit")}
              </Button>
            )}
          </div>
        </div>

        <div role="group" aria-label={ta("statusFilter")} className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={filterStatus === filter.value ? "default" : "outline"}
              aria-pressed={filterStatus === filter.value}
              className={cn(TEACHER_ACTION, "px-4")}
              onClick={() => setFilterStatus(filter.value)}
            >
              {filter.label} ({filter.count})
            </Button>
          ))}
        </div>

        {filteredStudents.length === 0 ? (
          <EmptyState icon={<Users />} title={t("noStudentsInSelectedStatus")} />
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => {
              const overdue = isOverdue(student);
              const isSelected = selectedStudents.includes(student.id);
              return (
                <li
                  key={student.id}
                  className={cn(
                    "flex min-w-0 items-start gap-3 rounded-xl border p-3",
                    overdue ? "border-destructive/30 bg-destructive/5" : "bg-background",
                    isSelected && "ring-primary ring-2",
                  )}
                >
                  {isEditMode ? (
                    <button
                      type="button"
                      onClick={() => handleStudentSelect(student.id)}
                      aria-label={ta("selectStudentFor", { name: student.displayName })}
                      aria-pressed={isSelected}
                      className="flex size-11 shrink-0 items-center justify-center rounded-lg"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-6 items-center justify-center rounded border-2",
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground",
                        )}
                      >
                        {isSelected ? <Check className="size-4" /> : null}
                      </span>
                    </button>
                  ) : null}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <h3 className="font-medium break-words">{student.displayName}</h3>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip tone={STATUS_TONE[student.status] ?? "neutral"}>{statusLabel(student.status)}</StatusChip>
                      {overdue ? <StatusChip tone="danger">{t("overdue")}</StatusChip> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
