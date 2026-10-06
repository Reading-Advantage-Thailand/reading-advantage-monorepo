"use client";
import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChartColumnBigIcon,
  ArchiveIcon,
  TrashIcon,
  ClipboardListIcon,
  PencilIcon,
  MoreHorizontalIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import CreateClass from "./create-classes";
import { toast } from "sonner";
import { Label } from "@radix-ui/react-label";
import { ErrorState, ShimmerSkeleton } from "@reading-advantage/ui";
import { TEACHER_ACTION } from "./teacher-shell";

type Classes = {
  id: string;
  name: string;
  teacherId: string;
  classCode: string | null;
  codeExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  students: {
    id: string;
    studentId: string;
    classroomId: string;
    student: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }[];
  teacher: {
    id: string;
    name: string | null;
    email: string | null;
  };
  // Legacy fields for backwards compatibility
  classroomName?: string;
  noOfStudents?: number;
  grade?: string;
  coTeacher?: {
    coTeacherId: string;
    name: string;
  };
  archived?: boolean;
  student?: {
    studentId: string;
    lastActivity: Date;
  }[];
};

/**
 * My Classes: the teacher's classes in a table (class name links to the class page, code,
 * student count, grade, and an actions menu), with search and new class. No Google Classroom
 * import (FR-12, owner decision 2026-10-05). Loading shows shimmer rows; a failed load shows an
 * error with a retry.
 * @returns The class list.
 */
export default function MyClasses() {
  const t = useTranslations("TeacherMyClasses");
  const tc = useTranslations("TeacherClass");
  const te = useTranslations("Error");
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classes[]>([]);
  const [dialogOpen, setDialogOpen] = useState<string>("");
  const [nameChange, setNameChange] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [classroomId, setClassroomId] = useState<string>("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const fetchClassrooms = async () => {
    try {
      const response = await fetch("/api/classroom");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setClassrooms(data.classrooms || []);
      setLoadState("ready");
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      setLoadState("error");
    }
  };

  const handleEditClass = async (
    classroomId: string,
    classroomName: string,
    grade: string,
  ) => {
    try {
      if (!classroomName || !grade) {
        toast.error(t("toast.attention"), {
          description: t("toast.fillAllFields"),
          richColors: true,
        });
        return;
      }

      const response = await fetch(`/api/classroom/${classroomId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomName,
          grade,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update class");
      }

      toast.success(t("toast.success"), {
        description: t("toast.classUpdated"),
        richColors: true,
      });

      setDialogOpen("");
      fetchClassrooms();
    } catch (error) {
      console.error(error);
      toast.error(t("toast.error"), {
        description: t("toast.failedUpdate"),
        richColors: true,
      });
    }
  };

  const handleDeleteClass = async (classroomId: string) => {
    try {
      const res = await fetch(`/api/classroom/${classroomId}`, {
        method: "DELETE",
      });
      if (res.status === 200) {
        toast.success(t("toast.success"), {
          description: t("toast.classDeleted"),
          richColors: true,
        });
        fetchClassrooms();
      } else {
        toast.error(t("toast.error"), {
          description: t("toast.failedDelete"),
          richColors: true,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(t("toast.error"), {
        description: t("toast.failedDelete"),
        richColors: true,
      });
    } finally {
      setDialogOpen("");
    }
  };

  const handleChangeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNameChange(e.target.value);
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const columns: ColumnDef<Classes>[] = [
    {
      accessorKey: "name",
      header: () => {
        return <div>{t("table.headers.className")}</div>;
      },
      cell: ({ row }) => {
        const classroomName: string = row.getValue("name");
        return (
          <Link
            href={`/teacher/class-roster/${row.original.id}`}
            className={cn(TEACHER_ACTION, "inline-flex items-center font-semibold underline-offset-4 hover:underline")}
          >
            {classroomName ? classroomName : "Unknown"}
          </Link>
        );
      },
    },
    {
      accessorKey: "classCode",
      header: () => {
        return (
          <div className="text-center">{t("table.headers.classCode")}</div>
        );
      },
      cell: ({ row }) => (
        <div className="text-center font-mono">{row.getValue("classCode")}</div>
      ),
    },
    {
      accessorKey: "students.length",
      header: () => {
        return (
          <div className="text-center">{t("table.headers.studentCount")}</div>
        );
      },
      cell: ({ row }) => (
        <div className="text-center">{row.original?.students?.length || 0}</div>
      ),
    },
    {
      accessorKey: "grade",
      header: () => {
        return <div className="text-center">{t("table.headers.grade")}</div>;
      },
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("grade")}</div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => {
        return <div className="text-center">{t("table.headers.actions")}</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="size-11 p-0"
                  aria-label={tc("classActionsFor", { name: payment.name })}
                >
                  <MoreHorizontalIcon aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/teacher/class-roster/${payment.id}`)
                  }
                >
                  <ClipboardListIcon className="size-4" />
                  {t("actions.roster")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/teacher/reports?classroomId=${payment.id}`)
                  }
                >
                  <ChartColumnBigIcon className="size-4" />
                  {t("actions.reports")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    setDialogOpen("edit");
                    setNameChange(payment.name);
                    setGrade(payment.grade || "");
                    setClassroomId(payment.id);
                  }}
                >
                  <PencilIcon className="size-4" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <ArchiveIcon className="size-4" />
                  {t("actions.archive")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDialogOpen("delete");
                    setClassroomId(payment.id);
                    setNameChange(payment.name);
                  }}
                >
                  <TrashIcon className="size-4" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        {loadState === "error" ? (
          <ErrorState
            className="bg-card border"
            icon={<TriangleAlertIcon />}
            title={tc("loadClassesError")}
            description={tc("loadErrorHint")}
            action={
              <Button
                type="button"
                className={cn(TEACHER_ACTION, "px-6")}
                onClick={() => {
                  setLoadState("loading");
                  void fetchClassrooms();
                }}
              >
                {te("retry")}
              </Button>
            }
          />
        ) : (
        <DataTable
          columns={columns}
          data={classrooms}
          loading={loadState === "loading"}
          loadingContent={[0, 1, 2].map((row) => (
            <tr key={row} aria-busy="true">
              <td colSpan={columns.length} className="p-2">
                <ShimmerSkeleton className="h-10 w-full" />
              </td>
            </tr>
          ))}
          emptyText={t("table.empty")}
          headerClassName="font-bold"
          wrapperClassName="bg-card rounded-2xl border"
          filterColumnId="name"
          toolbar={({ filterValue, setFilterValue }) => (
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Input
                type="search"
                aria-label={tc("searchClasses")}
                placeholder={t("search.placeholder")}
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                className="min-h-11 w-full sm:max-w-sm"
              />

              <CreateClass onClassCreated={fetchClassrooms} />
            </div>
          )}
          footer={({ previousPage, nextPage, canPreviousPage, canNextPage }) => (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className={TEACHER_ACTION}
                onClick={() => previousPage()}
                disabled={!canPreviousPage}
              >
                {t("pagination.previous")}
              </Button>
              <Button
                variant="outline"
                className={TEACHER_ACTION}
                onClick={() => nextPage()}
                disabled={!canNextPage}
              >
                {t("pagination.next")}
              </Button>
            </div>
          )}
        />
        )}
      </div>

      <Dialog
        open={dialogOpen === "edit"}
        onOpenChange={() => setDialogOpen("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit.title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t("edit.description")}
            {/* <span className="font-bold">{payment.name}</span> */}
          </DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("edit.className")}</Label>
              <Input
                type="text"
                className="col-span-3"
                placeholder={t("edit.classNamePlaceholder")}
                value={nameChange}
                onChange={handleChangeName}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("edit.grade")}</Label>
              <Select value={grade} onValueChange={(value) => setGrade(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("edit.gradePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 3).map(
                    (grade, index) => (
                      <SelectItem key={index} value={String(grade)}>
                        {t("edit.gradeItem", { grade })}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                setDialogOpen("");
                handleEditClass(classroomId, nameChange, grade);
              }}
            >
              {t("edit.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={dialogOpen === "delete"}
        onOpenChange={() => setDialogOpen("")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            {t("delete.description")}
            {/* <span className="font-bold">{classroomName}</span> */}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => handleDeleteClass(classroomId)}
            >
              {t("delete.submit")}
            </Button>
            <Button onClick={() => setDialogOpen("")}>
              {t("delete.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

