"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ColumnDef, SortingFn } from "@tanstack/react-table";
import { ArrowLeft, ChevronsUpDownIcon, Search, TriangleAlertIcon, Users } from "lucide-react";
import { EmptyState, ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { type AuthUser } from "@reading-advantage/auth-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ReportPanels } from "@/components/dashboard/report-panels";
import { CEFR_GAUGE_LEVELS } from "@/components/dashboard/user-level-indicator";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { UserActivityLog, UserXpLog } from "@/types";
import { TEACHER_ACTION } from "./teacher-shell";

interface Classroom {
  id: string;
  name: string;
  classCode: string;
  grade?: string;
  studentsEnrolled?: number;
}

interface Student {
  id: string;
  display_name: string;
  email: string;
  cefrLevel?: string;
  xp?: number;
  lastActivity?: Date;
  classrooms?: Array<{
    id: string;
    name: string;
    teacher?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

/** The activity of one student, with Date objects for the dates. */
interface StudentActivity {
  activity: UserActivityLog[];
  xpLogs: UserXpLog[];
}

/** The JSON body of `/api/users/[id]/activity`: the same rows, with the dates as ISO strings. */
interface StudentActivityBody {
  activity?: (Omit<UserActivityLog, "createdAt" | "completed"> & { createdAt: string; completed: boolean | null })[];
  xpLogs?: (Omit<UserXpLog, "createdAt"> & { createdAt: string })[];
}

/**
 * Reads the activity endpoint body. JSON has no dates, and the recent-activity list calls
 * `getTime()` on each row, so the ISO strings become Date objects here.
 * @param body The JSON body of `/api/users/[id]/activity`.
 * @returns The activity rows and XP logs with Date objects.
 */
function toStudentActivity(body: StudentActivityBody): StudentActivity {
  return {
    activity: (body.activity ?? []).map((row) => ({
      ...row,
      completed: row.completed ?? false,
      details: row.details ?? {},
      createdAt: new Date(row.createdAt),
    })),
    xpLogs: (body.xpLogs ?? []).map((row) => ({ ...row, createdAt: new Date(row.createdAt) })),
  };
}

/** Sorts CEFR levels in gauge order (A0- lowest), not as text. */
const byCefrLevel: SortingFn<Student> = (a, b) =>
  CEFR_GAUGE_LEVELS.indexOf((a.original.cefrLevel ?? "A0") as (typeof CEFR_GAUGE_LEVELS)[number]) -
  CEFR_GAUGE_LEVELS.indexOf((b.original.cefrLevel ?? "A0") as (typeof CEFR_GAUGE_LEVELS)[number]);

/**
 * A sortable column heading: a 44 px button that names the column and the sort action.
 * @param props.label The column name.
 * @param props.sortLabel The accessible name, for example "Sort by Name".
 * @param props.onSort Toggles the sort order of the column.
 * @returns The heading button.
 */
function SortHeader({ label, sortLabel, onSort }: { label: string; sortLabel: string; onSort: () => void }) {
  return (
    <Button type="button" variant="ghost" className={cn(TEACHER_ACTION, "-ml-3 px-3 font-bold")} aria-label={sortLabel} onClick={onSort}>
      {label}
      <ChevronsUpDownIcon aria-hidden="true" className="size-4" />
    </Button>
  );
}

interface TeacherProgressReportsProps {
  classrooms: Classroom[];
  students: Student[];
  currentUser: AuthUser;
  /** The class to open with (the `classroomId` query of the class page link). */
  initialClassroomId?: string;
}

/**
 * The teacher reports: a labelled class picker and a search, three summary tiles, and a sorted,
 * paged student table (name, classes, level, XP) that scrolls inside its own box on a phone. A
 * selected student shows the report panels for a teacher, with shimmer while the activity loads
 * and an error with a retry when it cannot load. A teacher without students gets a link to My
 * Classes.
 * @param props.classrooms The teacher's classes for the class filter.
 * @param props.students The students of those classes.
 * @param props.currentUser The signed-in teacher.
 * @param props.initialClassroomId The class to open with, when it is one of the classes.
 * @returns The reports view.
 */
export default function TeacherProgressReports({ classrooms, students, initialClassroomId }: TeacherProgressReportsProps) {
  const t = useTranslations("Reports");
  const ts = useTranslations("TeacherStudents");
  const tc = useTranslations("TeacherClass");
  const tp = useTranslations("teacher.myStudents.pagination");
  const te = useTranslations("Error");
  const [selectedClassroom, setSelectedClassroom] = useState<string>(
    initialClassroomId && classrooms.some((classroom) => classroom.id === initialClassroomId) ? initialClassroomId : "all",
  );
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<StudentActivity | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return students.filter(
      (student) =>
        (selectedClassroom === "all" || student.classrooms?.some((classroom) => classroom.id === selectedClassroom)) &&
        (!term || (student.display_name ?? "").toLowerCase().includes(term)),
    );
  }, [students, selectedClassroom, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const levelCounts: Record<string, number> = {};
    for (const student of filteredStudents) {
      const level = student.cefrLevel || "A0";
      levelCounts[level] = (levelCounts[level] ?? 0) + 1;
    }
    return {
      total,
      avgXp: total ? Math.round(filteredStudents.reduce((sum, student) => sum + (student.xp || 0), 0) / total) : 0,
      mostCommonLevel: Object.entries(levelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "A0",
    };
  }, [filteredStudents]);

  const fetchStudentData = useCallback(async (studentId: string) => {
    setLoading(true);
    setLoadError(false);
    try {
      // `/article-records` returns the history list (`{ success, data, pagination }`), not activity.
      const response = await fetch(`/api/users/${studentId}/activity`);
      if (!response.ok) throw new Error(`Failed to fetch activity: ${response.status}`);
      setStudentData(toStudentActivity(await response.json()));
    } catch (error) {
      console.error("Error fetching student data:", error);
      setStudentData(null);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStudent) {
      void fetchStudentData(selectedStudent);
    } else {
      setStudentData(null);
      setLoadError(false);
    }
  }, [selectedStudent, fetchStudentData]);

  const sortHeader = (label: string) => {
    const header: ColumnDef<Student>["header"] = ({ column }) => (
      <SortHeader label={label} sortLabel={ts("sortBy", { column: label })} onSort={() => column.toggleSorting(column.getIsSorted() === "asc")} />
    );
    return header;
  };

  const columns: ColumnDef<Student>[] = [
    {
      id: "name",
      accessorFn: (student) => student.display_name ?? "",
      header: sortHeader(ts("nameColumn")),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setSelectedStudent(row.original.id)}
          className={cn(TEACHER_ACTION, "text-left font-semibold break-words underline-offset-4 hover:underline")}
        >
          {row.original.display_name}
        </button>
      ),
    },
    {
      id: "classes",
      header: () => ts("classesColumn"),
      cell: ({ row }) => {
        const names = (row.original.classrooms ?? []).map((classroom) => classroom.name);
        return names.length ? (
          <span className="break-words">{names.join(", ")}</span>
        ) : (
          <span className="text-muted-foreground">{ts("noClass")}</span>
        );
      },
    },
    {
      id: "level",
      accessorFn: (student) => student.cefrLevel ?? "A0",
      sortingFn: byCefrLevel,
      header: sortHeader(ts("levelColumn")),
      cell: ({ row }) => <Badge variant="secondary">{row.original.cefrLevel || "A0"}</Badge>,
    },
    {
      id: "xp",
      accessorFn: (student) => student.xp ?? 0,
      header: sortHeader(ts("xpColumn")),
      cell: ({ row }) => <span className="whitespace-nowrap">{t("progress.xpLabel", { xp: row.original.xp || 0 })}</span>,
    },
  ];

  if (selectedStudent) {
    const student = students.find((item) => item.id === selectedStudent);
    const level = student?.cefrLevel || "A0";
    return (
      <div className="flex flex-col gap-6">
        <Button type="button" variant="outline" className={cn(TEACHER_ACTION, "w-fit px-4")} onClick={() => setSelectedStudent(null)}>
          <ArrowLeft aria-hidden="true" />
          {t("progress.backToOverview")}
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold break-words">{student?.display_name}</h2>
          <Badge variant="secondary">{level}</Badge>
        </div>
        {loading ? (
          <div aria-busy="true" className="flex flex-col gap-4">
            <span className="sr-only">{t("progress.loadingStudentData")}</span>
            <ShimmerSkeleton className="h-40 w-full rounded-2xl" />
            <ShimmerSkeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : loadError ? (
          <ErrorState
            className="bg-card border"
            icon={<TriangleAlertIcon />}
            title={ts("activityLoadError")}
            description={ts("loadErrorHint")}
            action={
              <Button type="button" className={cn(TEACHER_ACTION, "px-6")} onClick={() => void fetchStudentData(selectedStudent)}>
                {te("retry")}
              </Button>
            }
          />
        ) : studentData ? (
          <ReportPanels activity={studentData.activity} xpLogs={studentData.xpLogs} cefrLevel={level} audience="teacher" />
        ) : null}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <EmptyState
        className="bg-card border"
        icon={<Users />}
        title={ts("noStudents")}
        description={ts("noStudentsHint")}
        action={
          <Link href="/teacher/my-classes" className={cn(buttonVariants({ variant: "default" }), TEACHER_ACTION, "px-5")}>
            {ts("goToClasses")}
          </Link>
        }
      />
    );
  }

  const tiles = [
    { label: t("progress.totalStudents"), value: String(stats.total) },
    { label: t("progress.averageXp"), value: String(stats.avgXp) },
    { label: t("progress.mostCommonLevel"), value: stats.mostCommonLevel },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-col gap-1">
          <span id="reports-class-label" className="text-sm font-semibold">
            {ts("classLabel")}
          </span>
          <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
            <SelectTrigger aria-labelledby="reports-class-label" className="min-h-11 w-full sm:w-56">
              <SelectValue placeholder={t("progress.selectClassroom")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("progress.allClassrooms")}</SelectItem>
              {classrooms.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.name} ({classroom.classCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            aria-label={ts("searchLabel")}
            placeholder={t("progress.searchStudentsPlaceholder")}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="min-h-11 pl-10"
          />
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((tile) => (
          <li key={tile.label} className="bg-card flex min-w-0 flex-col gap-1 rounded-2xl border p-3 shadow-sm sm:p-4">
            <span className="text-muted-foreground text-xs font-medium break-words sm:text-sm">{tile.label}</span>
            <span className="text-xl font-bold sm:text-2xl">{tile.value}</span>
          </li>
        ))}
      </ul>

      <section aria-labelledby="reports-student-list" className="flex flex-col gap-3">
        <h2 id="reports-student-list" className="text-lg font-semibold">
          {t("progress.studentList")}
        </h2>
        <DataTable
          // Remounts the table when the filter changes, so the pager starts on page 1.
          key={`${selectedClassroom}\u0000${searchTerm}`}
          columns={columns}
          data={filteredStudents}
          initialSorting={[{ id: "name", desc: false }]}
          emptyText={searchTerm.trim() ? tc("noMatch") : ts("noStudentsInClass")}
          wrapperClassName="bg-card rounded-2xl border"
          tableClassName="min-w-[32rem]"
          headClassName="font-bold"
          footer={({ previousPage, nextPage, canPreviousPage, canNextPage, pageIndex, pageCount }) =>
            pageCount > 1 ? (
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" className={TEACHER_ACTION} onClick={previousPage} disabled={!canPreviousPage}>
                  {tp("previous")}
                </Button>
                <span className="text-sm whitespace-nowrap">{ts("pageOf", { page: pageIndex + 1, totalPages: pageCount })}</span>
                <Button type="button" variant="outline" className={TEACHER_ACTION} onClick={nextPage} disabled={!canNextPage}>
                  {tp("next")}
                </Button>
              </div>
            ) : null
          }
        />
      </section>
    </div>
  );
}
