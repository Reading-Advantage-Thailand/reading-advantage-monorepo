"use client";
import React, { useEffect, useRef, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ChevronsUpDownIcon } from "lucide-react";
import {
  ColumnDef,
  VisibilityState,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Header } from "./header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, th, zhCN, zhTW, vi } from "date-fns/locale";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { PaginationInfo } from "@/types";

/**
 * Status values for student assignment progress. Mirrors the Prisma
 * `AssignmentStatus` enum (replaced during the Prisma → Drizzle migration,
 * track `primary_advantage_drizzle_migration_20260526`, Phase 6).
 *
 * The Drizzle `studentAssignments.status` column is plain text (no pgEnum),
 * so we model the union locally and infer the row type from the schema.
 */
type AssignmentStatusValue = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

const AssignmentStatus = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
} as const satisfies Record<AssignmentStatusValue, AssignmentStatusValue>;

interface Assignment {
  id: string;
  classroomId: string;
  articleId: string | null;
  lessonId: string | null;
  title: string;
  type: string;
  description: string | null;
  dueDate: string | null;
  createdAt: string;
  teacherId: string;
  teacherName: string | null;
}

/** One student-assignment row with its nested assignment. */
export interface AssignmentStudent {
  id: string;
  studentId: string;
  status: AssignmentStatusValue | null;
  score: number | null;
  startedAt: string | null;
  assignmentId: string;
  createdAt: string;
  completedAt: string | null;
  assignment: Assignment;
}

interface DueDateStatusInfo {
  status: string;
  variant: "destructive" | "secondary" | "outline" | "default";
  text: string;
}

interface AssignmentDetailDialogProps {
  assignment: AssignmentStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dueDateStatus: DueDateStatusInfo | null;
  assignByLabel: string;
  onGoToLesson: (assignmentId: string) => void;
}

/**
 * Shows assignment details on small screens without remounting per render.
 * @param props Selected assignment and dialog controls.
 * @returns The detail dialog, or null when nothing is selected.
 */
function AssignmentDetailDialog({
  assignment,
  open,
  onOpenChange,
  dueDateStatus,
  assignByLabel,
  onGoToLesson,
}: AssignmentDetailDialogProps) {
  const t = useTranslations("Assignment.studentAssignmentTable");

  if (!assignment) return null;

  const dueDate = assignment.assignment.dueDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-[90vw] overflow-y-auto sm:max-w-[425px]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              {t("description")}
            </h4>
            <p className="text-sm">
              {assignment.assignment.description || "No description provided"}
            </p>
          </div>

          {/* Created Date */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              {t("createAt")}
            </h4>
            <p className="text-sm">
              {format(new Date(assignment.createdAt), "MMM dd, yyyy", {
                locale: enUS,
              })}
            </p>
          </div>

          {/* Due Date */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              {t("dueDate")}
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-sm">
                {dueDate
                  ? format(new Date(dueDate), "MMM dd, yyyy", { locale: enUS })
                  : "No due date"}
              </p>
              {dueDateStatus &&
                assignment.status !== AssignmentStatus.COMPLETED && (
                  <Badge variant={dueDateStatus.variant} className="text-xs">
                    {dueDateStatus.text}
                  </Badge>
                )}
            </div>
          </div>

          {/* Status */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              {t("status")}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {/* {getStatusIcon(assignment.status as number)} */}
              </span>
              <span className="text-sm">
                {/* {getStatusText(assignment.status as number)} */}
              </span>
            </div>
          </div>

          {/* Assigned By */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              {assignByLabel}
            </h4>
            <p className="text-sm">
              {assignment.assignment.teacherName || "Unknown Teacher"}
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button
              onClick={() => {
                onGoToLesson(assignment.assignment.id);
              }}
              className="w-full"
            >
              {t("goToLesson")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Student assignment table. Renders server-fetched initial rows when given
 * and refetches from the API only for user actions (filters, search, paging).
 * @param initialAssignments Assignments fetched on the server page.
 * @param initialPagination Pagination fetched on the server page.
 * @returns The student assignment table.
 */
export default function StudentAssignmentTable({
  initialAssignments,
  initialPagination,
}: {
  initialAssignments?: AssignmentStudent[];
  initialPagination?: PaginationInfo;
}) {
  const user = useCurrentUser();

  const [assignments, setAssignments] = useState<AssignmentStudent[]>(
    initialAssignments ?? [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo>(
    initialPagination ?? {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      hasNextPage: false,
      hasPrevPage: false,
      limit: 10,
    },
  );
  // The server page already fetched the first page, so skip the effect's
  // initial run and only fetch for later user actions.
  const isFirstFetch = useRef(initialAssignments !== undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssignment, setSelectedAssignment] =
    useState<AssignmentStudent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      "assignment.description": false,
      createdAt: false,
      "assignment.teacherName": false,
      actions: false,
    });
  const t = useTranslations("Assignment.studentAssignmentTable");
  const tComponents = useTranslations("Components");
  const router = useRouter();

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setColumnVisibility({
        "assignment.description": !mobile,
        createdAt: !mobile,
        "assignment.teacherName": !mobile,
        actions: !mobile,
      });
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  const getDueDateStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return {
        status: "overdue",
        variant: "destructive" as const,
        text: t("overdue"),
      };
    } else if (daysDiff === 0) {
      return {
        status: "today",
        variant: "secondary" as const,
        text: t("dueToday"),
      };
    } else if (daysDiff <= 3) {
      return {
        status: "soon",
        variant: "outline" as const,
        text: t("daysLeft", { daysDiff: daysDiff }),
      };
    } else {
      return {
        status: "upcoming",
        variant: "default" as const,
        text: t("daysLeft", { daysDiff: daysDiff }),
      };
    }
  };

  const columns: ColumnDef<AssignmentStudent>[] = [
    {
      accessorKey: "assignment.title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("name")}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const name = row.original.assignment.title;

        return (
          <div className="ml-4">
            <div className="font-medium">{name}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "assignment.description",
      header: () => {
        return <div className="text-center">{t("description")}</div>;
      },
      cell: ({ row }) => {
        const description: string = row.original.assignment.description || "";

        return (
          <div className="flex justify-center">
            <div className="text-muted-foreground mt-1 text-center text-sm">
              {description}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("createAt")}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const createdAt: string = row.getValue("createdAt");
        return (
          <div className="flex justify-center">
            <div className="text-sm">
              {format(new Date(createdAt), "MMM dd, yyyy", {
                locale: enUS,
              })}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "assignment.dueDate",
      header: ({ column }) => {
        return (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {t("dueDate")}
              <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const dueDate = row.original.assignment.dueDate;
        if (!dueDate) return <div className="text-center">No due date</div>;
        const dueDateStatus = getDueDateStatus(dueDate);
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="font-medium">
              {format(new Date(dueDate), "MMM dd, yyyy", {
                locale: enUS,
              })}
            </div>
            {row.original.status !== AssignmentStatus.COMPLETED && (
              <Badge variant={dueDateStatus.variant} className="mt-1">
                {dueDateStatus.text}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => {
        return <div className="text-center">{t("status")}</div>;
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as AssignmentStatusValue | null;

        const getStatusIcon = (status: AssignmentStatusValue | null) => {
          switch (status) {
            case AssignmentStatus.NOT_STARTED:
              return "⏳";
            case AssignmentStatus.IN_PROGRESS:
              return "🔄";
            case AssignmentStatus.COMPLETED:
              return "✅";
            default:
              return "⏳";
          }
        };

        const getStatusText = (status: AssignmentStatusValue | null) => {
          switch (status) {
            case AssignmentStatus.NOT_STARTED:
              return t("notFinished");
            case AssignmentStatus.IN_PROGRESS:
              return t("inProgress");
            case AssignmentStatus.COMPLETED:
              return t("done");
            default:
              return t("notFinished");
          }
        };

        return (
          <div className="flex items-center justify-center gap-2">
            <span>{getStatusIcon(status)}</span>
            <span>{getStatusText(status)}</span>
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === undefined) return true;
        return row.getValue(columnId) === filterValue;
      },
    },
    {
      accessorKey: "assignment.teacherName",
      header: () => {
        return <div className="text-center">{t("assignedBy")}</div>;
      },
      cell: ({ row }) => {
        const teacherName: string =
          row.original.assignment.teacherName || "Unknown Teacher";
        return <div className="text-center">{teacherName}</div>;
      },
    },
    {
      id: "actions",
      header: () => {
        return <div className="text-center">{t("linkToAssignment")}</div>;
      },
      cell: ({ row }) => {
        const assignment = row.original.assignment;
        return (
          <div className="flex w-24 items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/student/lesson/${assignment.id}`)}
            >
              {t("goToLesson")}
            </Button>
          </div>
        );
      },
    },
  ];

  const dueDateColumn = columns.find(
    (col) => "accessorKey" in col && col.accessorKey === "assignment.dueDate",
  );

  if (dueDateColumn) {
    dueDateColumn.filterFn = (row, columnId, filterValue) => {
      if (!filterValue) return true;

      const dueDate = new Date(row.getValue(columnId) as string);
      const now = new Date();

      switch (filterValue) {
        case "overdue":
          return dueDate < now;
        case "today":
          return dueDate.toDateString() === now.toDateString();
        case "upcoming":
          return dueDate > now;
        default:
          return true;
      }
    };
  }

  const fetchAssignment = async (
    page: number = 1,
    status?: string,
    dueDateStatus?: string,
    search?: string, // เพิ่ม search parameter
  ) => {
    try {
      if (!user?.id) {
        console.error("Missing required studentId");
        return;
      }

      let url = `/api/students/${user.id}/assignments?page=${page}&limit=10`;

      if (status && status !== "all") {
        url += `&status=${status}`;
      }

      if (dueDateStatus && dueDateStatus !== "all") {
        url += `&dueDateFilter=${dueDateStatus}`;
      }

      if (search && search.trim() !== "") {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(
          `HTTP ${response.status}: ${errorData.message || "Unknown error"}`,
        );
      }

      const data = await response.json();

      setAssignments(data.assignments || []);
      setPagination(
        data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
        },
      );
    } catch (error) {
      console.error("Error fetching assignment:", error);
      // Reset to empty state on error
      setAssignments([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10,
      });
    }
  };

  useEffect(() => {
    if (isFirstFetch.current) {
      isFirstFetch.current = false;
      return;
    }
    const fetchData = async () => {
      setLoading(true);
      await fetchAssignment(
        currentPage,
        statusFilter,
        dueDateFilter,
        debouncedSearchQuery,
      );
      setLoading(false);
    };

    fetchData();
  }, [
    user?.id,
    currentPage,
    statusFilter,
    dueDateFilter,
    debouncedSearchQuery,
  ]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDueDateFilterChange = (value: string) => {
    setDueDateFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // รีเซ็ตไปหน้า 1 เมื่อ search
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleRowClick = (assignment: AssignmentStudent) => {
    if (isMobile) {
      setSelectedAssignment(assignment);
      setIsDialogOpen(true);
    }
  };

  const selectedDueDate = selectedAssignment?.assignment.dueDate ?? null;
  const dialogDueDateStatus = selectedDueDate
    ? getDueDateStatus(selectedDueDate)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <Header heading={t("title")} />
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="max-w-sm focus-visible:ring-0"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="min-w-[120px] rounded-md border px-3 py-1 text-sm"
            value={statusFilter}
            onChange={(event) => {
              handleStatusFilterChange(event.target.value);
            }}
          >
            <option value="all">{t("allStatus")}</option>
            <option value="0">{t("notFinished")}</option>
            <option value="1">{t("inProgress")}</option>
            <option value="2">{t("done")}</option>
          </select>
          <select
            className="min-w-[120px] rounded-md border px-3 py-1 text-sm"
            value={dueDateFilter}
            onChange={(event) => {
              handleDueDateFilterChange(event.target.value);
            }}
          >
            <option value="all">{t("allDueDates")}</option>
            <option value="overdue">{t("overdue")}</option>
            <option value="today">{t("dueToday")}</option>
            <option value="upcoming">{t("upcoming")}</option>
          </select>
        </div>
      </div>
      {searchQuery !== debouncedSearchQuery && (
        <div className="text-muted-foreground text-sm">{t("searching")}</div>
      )}
      <DataTable
        columns={columns}
        data={assignments}
        loading={false}
        emptyText={loading ? t("loadingAssignments") : t("noAssignmentsFound")}
        manualPagination
        manualFiltering
        initialSorting={[{ id: "createdAt", desc: true }]}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        onRowClick={isMobile ? handleRowClick : undefined}
        wrapperClassName="overflow-x-auto rounded-md border"
        tableClassName="min-w-full"
        headerClassName="font-bold"
        headClassName="px-2 py-3 text-xs sm:text-sm"
        cellClassName="px-2 py-3 text-xs sm:text-sm"
        rowClassName={isMobile ? "hover:bg-muted/50 cursor-pointer" : ""}
        footer={
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={!pagination.hasPrevPage || loading}
            className="text-xs sm:text-sm"
          >
            {tComponents("previousButton")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage || loading}
            className="text-xs sm:text-sm"
          >
            {tComponents("nextButton")}
          </Button>
        </div>
      </div>

        }
      />

      <AssignmentDetailDialog
        assignment={selectedAssignment}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        dueDateStatus={dialogDueDateStatus}
        assignByLabel={t("assignedBy")}
        onGoToLesson={(assignmentId) =>
          router.push(`/student/lesson/${assignmentId}`)
        }
      />
    </div>
  );
}
