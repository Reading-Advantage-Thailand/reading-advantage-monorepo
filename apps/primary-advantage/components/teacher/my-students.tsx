"use client";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ColumnDef } from "@tanstack/react-table";
import { ChevronsUpDownIcon, MoreHorizontalIcon, RotateCcw, Search, TrendingUp, TriangleAlertIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import StudentCefrLevelSetter from "./student-cefr-level-setter";
import { TEACHER_ACTION } from "./teacher-shell";

/** One student, as `/api/classroom/students` returns it. */
type Student = {
  id: string;
  email: string | null;
  display_name: string;
  xp?: number;
  level?: number;
  cefrLevel?: string;
  classrooms?: Array<{
    id: string;
    name: string;
    teacher?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

/**
 * My Students: a labelled search and a sorted, paged table (name linked to the progress page,
 * classes, level, XP, and a named actions menu) that scrolls inside its own box on a phone. The
 * table shows classes, not emails: students sign in by username, so the email was "Unknown" for
 * most of them. Names show as stored (no CSS capitalize). Loading shows shimmer rows; a failed
 * load shows an error with a retry; a teacher without students gets a link to My Classes.
 * @returns The students screen.
 */
export default function MyStudents() {
  const t = useTranslations("teacher.myStudents");
  const ts = useTranslations("TeacherStudents");
  const tc = useTranslations("TeacherClass");
  const te = useTranslations("Error");
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoadError(false);
    try {
      const response = await fetch("/api/classroom/students", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.status}`);
      }

      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStudents();
  }, [fetchStudents]);

  const retry = () => {
    setIsLoading(true);
    void fetchStudents();
  };

  const handleResetProgress = async (studentId: string) => {
    try {
      const response = await fetch(`/api/users/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          xp: 0,
          level: 1,
          cefrLevel: "A0-",
        }),
      });

      if (response.status === 400) {
        toast(t("toast.reset.error"));
        return;
      }

      if (response.status === 200) {
        toast(t("toast.reset.success"));
        await fetchStudents();
      }
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast(t("toast.reset.error"));
    } finally {
      setIsResetModalOpen(false);
    }
  };

  const nameOf = (student: Student) => student.display_name || t("unknown.student");

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className={cn(TEACHER_ACTION, "-ml-3 px-3 font-bold")}
          aria-label={ts("sortBy", { column: t("table.name") })}
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.name")}
          <ChevronsUpDownIcon aria-hidden="true" className="size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/teacher/student-progress/${row.original.id}`}
          className={cn(TEACHER_ACTION, "inline-flex items-center font-semibold break-words underline-offset-4 hover:underline")}
        >
          {nameOf(row.original)}
        </Link>
      ),
    },
    {
      id: "classrooms",
      header: () => ts("classesColumn"),
      cell: ({ row }) => {
        const classrooms = row.original.classrooms ?? [];
        if (!classrooms.length) return <span className="text-muted-foreground">{t("classrooms.none")}</span>;
        return (
          <span className="break-words">
            {classrooms
              .map((classroom) => (classroom.teacher?.name ? `${classroom.name} (${classroom.teacher.name})` : classroom.name))
              .join(", ")}
          </span>
        );
      },
    },
    {
      id: "level",
      header: () => ts("levelColumn"),
      cell: ({ row }) => <Badge variant="secondary">{row.original.cefrLevel || "A0-"}</Badge>,
    },
    {
      id: "xp",
      header: () => ts("xpColumn"),
      cell: ({ row }) => <span className="whitespace-nowrap">{tc("xp", { xp: row.original.xp ?? 0 })}</span>,
    },
    {
      id: "action",
      header: () => <span className="sr-only">{t("table.actions")}</span>,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-11 p-0" aria-label={tc("classActionsFor", { name: nameOf(student) })}>
                  <MoreHorizontalIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild className="min-h-11">
                  <Link href={`/teacher/student-progress/${student.id}`}>
                    <TrendingUp className="mr-1 size-4" aria-hidden="true" />
                    {t("actions.progress")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div>
                  <StudentCefrLevelSetter
                    studentId={student.id}
                    studentName={nameOf(student)}
                    currentCefrLevel={student.cefrLevel || "A0-"}
                    onUpdate={fetchStudents}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setSelectedStudentId(student.id);
                  }}
                  className="text-destructive min-h-11"
                >
                  <RotateCcw className="mr-1 size-4" aria-hidden="true" />
                  {t("actions.resetProgress")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  if (loadError) {
    return (
      <ErrorState
        className="bg-card border"
        icon={<TriangleAlertIcon />}
        title={ts("loadError")}
        description={ts("loadErrorHint")}
        action={
          <Button type="button" className={cn(TEACHER_ACTION, "px-6")} onClick={retry}>
            {te("retry")}
          </Button>
        }
      />
    );
  }

  if (!isLoading && students.length === 0) {
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

  return (
    <>
      <DataTable
        columns={columns}
        data={students}
        loading={isLoading}
        loadingContent={[0, 1, 2].map((row) => (
          <tr key={row} aria-busy="true">
            <td colSpan={columns.length} className="p-2">
              <ShimmerSkeleton className="h-10 w-full" />
            </td>
          </tr>
        ))}
        emptyText={tc("noMatch")}
        initialSorting={[{ id: "display_name", desc: false }]}
        wrapperClassName="bg-card rounded-2xl border"
        tableClassName="min-w-[36rem]"
        headClassName="font-bold"
        filterColumnId="display_name"
        toolbar={({ filterValue, setFilterValue }) => (
          <div className="relative mb-3 max-w-sm">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
            <Input
              type="search"
              aria-label={ts("searchLabel")}
              placeholder={t("search.placeholder")}
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              className="min-h-11 pl-10"
            />
          </div>
        )}
        footer={({ previousPage, nextPage, canPreviousPage, canNextPage, pageIndex, pageCount }) =>
          pageCount > 1 ? (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" className={TEACHER_ACTION} onClick={previousPage} disabled={!canPreviousPage}>
                {t("pagination.previous")}
              </Button>
              <span className="text-sm whitespace-nowrap">{ts("pageOf", { page: pageIndex + 1, totalPages: pageCount })}</span>
              <Button type="button" variant="outline" className={TEACHER_ACTION} onClick={nextPage} disabled={!canNextPage}>
                {t("pagination.next")}
              </Button>
            </div>
          ) : null
        }
      />
      <Dialog open={isResetModalOpen} onOpenChange={() => setIsResetModalOpen(!isResetModalOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.reset.title")}</DialogTitle>
            <DialogDescription>{t("dialog.reset.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" className={TEACHER_ACTION} onClick={() => setIsResetModalOpen(false)}>
              {t("actions.cancel")}
            </Button>
            <Button variant="destructive" className={TEACHER_ACTION} onClick={() => void handleResetProgress(selectedStudentId)}>
              {t("actions.reset")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
