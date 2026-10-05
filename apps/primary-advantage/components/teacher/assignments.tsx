"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { SchoolIcon, Search, TriangleAlertIcon } from "lucide-react";
import { EmptyState, ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { DataTable } from "@/components/ui/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import type { PaginationInfo } from "@/types";
import { DueChip } from "./due-chip";
import { TEACHER_ACTION, TeacherPageHeader } from "./teacher-shell";

/** One assignment row, as `/api/teachers/assignments` returns it. */
type Assignment = {
  articleId: string;
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
  };
  students: {
    id: string;
    displayName: string;
    studentId: string;
    status: number | string;
  }[];
};

/** One class of the teacher. */
interface Classroom {
  id: string;
  name: string;
}

const EMPTY_PAGE: PaginationInfo = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  hasNextPage: false,
  hasPrevPage: false,
  limit: 10,
};

/**
 * Teacher assignments: a labelled class picker (the first class opens by default), a search, and
 * a table of the class assignments (title link to the assignment page, created date and due date
 * in the Bangkok time zone, a due chip, and the student count). The table scrolls inside its own
 * box on a phone. Loading shows shimmer rows; a failed load shows an error with a retry; a
 * teacher without a class gets a link to My Classes.
 * @returns The assignments screen.
 */
export default function Assignments() {
  const t = useTranslations("Teacher.Assignments");
  const ta = useTranslations("TeacherAssignments");
  const te = useTranslations("Error");
  const format = useFormatter();
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>(EMPTY_PAGE);
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  const fetchAssignments = useCallback(async (classroomId: string, page: number = 1, search?: string) => {
    setIsLoading(true);
    setLoadError(false);
    try {
      let url = `/api/teachers/assignments?classroomId=${classroomId}&page=${page}&limit=10`;
      if (search && search.trim() !== "") {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const response = await fetch(url, { method: "GET" });
      if (!response.ok) {
        throw new Error("Failed to fetch assignments");
      }
      const data = await response.json();
      if (data.assignments) {
        setAssignments(data.assignments);
        setPagination(data.pagination);
      } else if (Array.isArray(data)) {
        setAssignments(data);
        setPagination({ ...EMPTY_PAGE, totalCount: data.length });
      }
    } catch (error) {
      console.error(error);
      setAssignments([]);
      setPagination(EMPTY_PAGE);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleClassChange = (value: string) => {
    setSelectedClassroom(value);
    setCurrentPage(1);
    setSearchQuery("");
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    void fetchAssignments(selectedClassroom, page, debouncedSearchQuery);
  };

  // Reads page 1 when the class or the (debounced) search changes.
  useEffect(() => {
    if (selectedClassroom) {
      setCurrentPage(1);
      void fetchAssignments(selectedClassroom, 1, debouncedSearchQuery);
    }
  }, [selectedClassroom, debouncedSearchQuery, fetchAssignments]);

  // Reads the classes and opens the first class (audit T9: the list stayed empty until the
  // teacher picked a class). A failed read shows the error with a retry, not "no classes".
  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const res = await fetch("/api/classroom");
      if (!res.ok) throw new Error(`Failed to fetch classrooms: ${res.status}`);
      const data = await res.json();
      const rooms: Classroom[] = data.classrooms ?? [];
      setClassrooms(rooms);
      if (rooms.length) setSelectedClassroom(rooms[0].id);
      else setIsLoading(false);
    } catch (error) {
      console.error(error);
      setLoadError(true);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  /** Retries the step that failed: the class list, or the assignments of the open class. */
  const retry = () => (classrooms === null ? void loadClasses() : void fetchAssignments(selectedClassroom, currentPage, debouncedSearchQuery));

  const formatDate = (value: string, withTime: boolean) =>
    format.dateTime(new Date(value), withTime
      ? { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" });

  const columns: ColumnDef<Assignment>[] = [
    {
      id: "title",
      accessorFn: (row) => row.meta.title,
      header: () => t("table.headers.assignment"),
      cell: ({ row }) => (
        <Link
          href={`/teacher/assignments/${row.original.meta.id}`}
          className={cn(TEACHER_ACTION, "inline-flex items-center font-semibold break-words underline-offset-4 hover:underline")}
        >
          {row.original.meta.title}
        </Link>
      ),
    },
    {
      id: "createdAt",
      header: () => t("table.headers.createdOn"),
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.meta.createdAt, true)}</span>,
    },
    {
      id: "dueDate",
      header: () => t("table.headers.dueDate"),
      cell: ({ row }) => (
        <div className="flex flex-col items-start gap-1">
          {row.original.meta.dueDate && !Number.isNaN(new Date(row.original.meta.dueDate).getTime()) ? (
            <span className="whitespace-nowrap">{formatDate(row.original.meta.dueDate, false)}</span>
          ) : null}
          <DueChip dueDate={row.original.meta.dueDate} />
        </div>
      ),
    },
    {
      id: "students",
      header: () => <div className="text-center">{t("table.headers.students")}</div>,
      cell: ({ row }) => <div className="text-center">{row.original.students.length}</div>,
    },
  ];

  const header = <TeacherPageHeader title={t("heading")} />;

  if (classrooms !== null && classrooms.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          className="bg-card border"
          icon={<SchoolIcon />}
          title={ta("noClasses")}
          description={ta("noClassesHint")}
          action={
            <Link href="/teacher/my-classes" className={cn(buttonVariants({ variant: "default" }), TEACHER_ACTION, "px-5")}>
              {ta("goToClasses")}
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {header}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-col gap-1">
          <span id="assignment-class-label" className="text-sm font-semibold">
            {ta("classLabel")}
          </span>
          <Select value={selectedClassroom} onValueChange={handleClassChange}>
            <SelectTrigger aria-labelledby="assignment-class-label" className="min-h-11 w-full sm:w-56">
              <SelectValue placeholder={t("selectors.selectClassroom")} />
            </SelectTrigger>
            <SelectContent className="max-h-48 overflow-y-auto">
              {classrooms?.map((classroom) => (
                <SelectItem key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input
            type="search"
            aria-label={ta("searchLabel")}
            placeholder={t("search.placeholder")}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="min-h-11 pl-10"
            disabled={!selectedClassroom}
          />
        </div>
        {searchQuery !== debouncedSearchQuery && (
          <p role="status" className="text-muted-foreground text-sm">
            {t("search.searching")}
          </p>
        )}
      </div>

      {loadError ? (
        <ErrorState
          className="bg-card border"
          icon={<TriangleAlertIcon />}
          title={ta("loadError")}
          description={ta("loadErrorHint")}
          action={
            <Button type="button" className={cn(TEACHER_ACTION, "px-6")} onClick={retry}>
              {te("retry")}
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={assignments}
          loading={isLoading}
          loadingContent={[0, 1, 2].map((row) => (
            <tr key={row} aria-busy="true">
              <td colSpan={columns.length} className="p-2">
                <ShimmerSkeleton className="h-10 w-full" />
              </td>
            </tr>
          ))}
          emptyText={selectedClassroom ? t("empty.noAssignments") : t("empty.selectClassroom")}
          manualPagination
          manualFiltering
          wrapperClassName="bg-card rounded-2xl border"
          tableClassName="min-w-[36rem]"
          headClassName="font-bold"
          footer={
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted-foreground text-sm">
                {t("pagination.showing", {
                  from: Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalCount),
                  to: Math.min(pagination.currentPage * pagination.limit, pagination.totalCount),
                  total: pagination.totalCount,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className={TEACHER_ACTION}
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={!pagination.hasPrevPage || isLoading}
                >
                  {t("pagination.previous")}
                </Button>
                <span className="text-sm whitespace-nowrap">
                  {t("pagination.pageOf", { page: pagination.currentPage, totalPages: pagination.totalPages })}
                </span>
                <Button
                  variant="outline"
                  className={TEACHER_ACTION}
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={!pagination.hasNextPage || isLoading}
                >
                  {t("pagination.next")}
                </Button>
              </div>
            </div>
          }
        />
      )}
    </div>
  );
}
