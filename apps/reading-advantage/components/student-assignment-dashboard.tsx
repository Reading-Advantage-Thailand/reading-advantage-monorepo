"use client";
import React, { useCallback, useEffect, useState } from "react";
import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CaretSortIcon } from "@radix-ui/react-icons";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import SearchFilterDashboard from "@/components/student/search-filter-dashboard";
import AssignmentTableDashboard from "@/components/student/assignment-table-dashboard";
import { Header } from "./header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, th, zhCN, zhTW, vi } from "date-fns/locale";
import { useCurrentLocale, useScopedI18n, useRouter } from "@/locales/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { AssignmentNotificationBadge } from "@/components/student/assignment-notification-badge";

interface AssignmentProps {
  userId: string;
}

type Assignment = {
  id: string;
  assignmentId?: string;
  classroomId: string;
  articleId: string;
  title: string;
  description: string;
  dueDate: string;
  status: number;
  createdAt: string;
  teacherId: string;
  displayName: string;
  teacherDisplayName?: string;
  completed?: boolean;
};

type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
};

type AssignmentT = ReturnType<typeof useScopedI18n>;

function getDateLocale(locale: string) {
  switch (locale) {
    case "th":
      return th;
    case "cn":
      return zhCN;
    case "tw":
      return zhTW;
    case "vi":
      return vi;
    default:
      return enUS;
  }
}

function getDueDateStatus(dueDate: string, t: AssignmentT) {
  const now = new Date();
  const due = new Date(dueDate);
  const timeDiff = due.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (daysDiff < 0) {
    return {
      status: "overdue",
      variant: "destructive" as const,
      text: `${t("overdue")}`,
    };
  } else if (daysDiff === 0) {
    return {
      status: "today",
      variant: "secondary" as const,
      text: `${t("dueToday")}`,
    };
  } else if (daysDiff <= 3) {
    return {
      status: "soon",
      variant: "outline" as const,
      text: `${t("daysLeft", { daysDiff: daysDiff })}`,
    };
  } else {
    return {
      status: "upcoming",
      variant: "default" as const,
      text: `${t("daysLeft", { daysDiff: daysDiff })}`,
    };
  }
}

function AssignmentDetailDialog({
  assignment,
  open,
  onOpenChange,
  t,
  locale,
}: {
  assignment: Assignment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: AssignmentT;
  locale: string;
}) {
  const router = useRouter();

  if (!assignment) return null;

  const dueDateStatus = getDueDateStatus(assignment.dueDate, t);

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0:
        return "⏳";
      case 1:
        return "🔄";
      case 2:
        return "✅";
      default:
        return "⏳";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return `${t("notFinished")}`;
      case 1:
        return `${t("inProgress")}`;
      case 2:
        return `${t("done")}`;
      default:
        return `${t("notFinished")}`;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          {/* Description */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              {t("assignmentDescription")}
            </h4>
            <p className="text-sm">
              {assignment.description || "No description provided"}
            </p>
          </div>

          {/* Created Date */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              {t("createAt")}
            </h4>
            <p className="text-sm">
              {format(new Date(assignment.createdAt), "MMM dd, yyyy", {
                locale: getDateLocale(locale),
              })}
            </p>
          </div>

          {/* Due Date */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              {t("dueDate")}
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-sm">
                {format(new Date(assignment.dueDate), "MMM dd, yyyy", {
                  locale: getDateLocale(locale),
                })}
              </p>
              {assignment.status !== 2 && (
                <Badge variant={dueDateStatus.variant} className="text-xs">
                  {dueDateStatus.text}
                </Badge>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              {t("status")}
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-lg">{getStatusIcon(assignment.status)}</span>
              <span className="text-sm">{getStatusText(assignment.status)}</span>
            </div>
          </div>

          {/* Assigned By */}
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2">
              {t("assignedBy")}
            </h4>
            <p className="text-sm">
              {assignment.teacherDisplayName ||
                assignment.displayName ||
                "Unknown Teacher"}
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button
              onClick={() => {
                router.push(`/student/lesson/${assignment.articleId}`);
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

export default function StudentAssignmentTable({ userId }: AssignmentProps) {
  if (!userId) {
    redirect("/auth/signin");
  }

  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "createdAt",
      desc: true,
    },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const locale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";
  const t = useScopedI18n("pages.student.assignmentPage");  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      description: false,
      createdAt: false,
      teacherDisplayName: false,
      actions: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifiedAssignmentIds, setNotifiedAssignmentIds] = useState<
    Set<string>
  >(new Set());
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setColumnVisibility({
        description: !mobile,
        createdAt: !mobile,
        teacherDisplayName: !mobile,
        actions: !mobile,
      });
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  const columns: ColumnDef<Assignment>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("assignmentTitle")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const title: string = row.getValue("title");
        const description = row.original.description;
        const assignmentId = row.original.assignmentId || row.original.id;
        return (
          <div className="ml-4">
            <div className="font-medium flex items-center">
              {title}
              <AssignmentNotificationBadge
                assignmentId={assignmentId}
                notifiedAssignmentIds={notifiedAssignmentIds}
              />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: () => {
        return <div className="text-center">{t("assignmentDescription")}</div>;
      },
      cell: ({ row }) => {
        const title: string = row.getValue("description");
        const description = row.original.description;
        return (
          <div className="flex justify-center">
            <div className="text-sm text-muted-foreground mt-1 text-center">
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
              <CaretSortIcon className="ml-2 h-4 w-4" />
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
                locale: getDateLocale(locale),
              })}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
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
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const dueDate: string = row.getValue("dueDate");
        const dueDateStatus = getDueDateStatus(dueDate, t);
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <div className="font-medium">
              {format(new Date(dueDate), "MMM dd, yyyy", {
                locale: getDateLocale(locale),
              })}
            </div>
            {row.original.status !== 2 && (
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
        const assignment = row.original;
        const completionStatus = assignment.status;

        const getStatusIcon = (status: number) => {
          switch (status) {
            case 0:
              return "⏳";
            case 1:
              return "🔄";
            case 2:
              return "✅";
            default:
              return "⏳";
          }
        };

        const getStatusText = (status: number) => {
          switch (status) {
            case 0:
              return `${t("notFinished")}`;
            case 1:
              return `${t("inProgress")}`;
            case 2:
              return `${t("done")}`;
            default:
              return `${t("notFinished")}`;
          }
        };

        return (
          <div className="flex justify-center items-center gap-2">
            <span className="text-lg">{getStatusIcon(completionStatus)}</span>
            <span className="text-sm w-8">
              {getStatusText(completionStatus)}
            </span>
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        if (filterValue === undefined) return true;
        return row.getValue(columnId) === filterValue;
      },
    },
    {
      accessorKey: "teacherDisplayName",
      header: () => {
        return <div className="text-center">{t("assignedBy")}</div>;
      },
      cell: ({ row }) => (
        <div className="text-center">
          {row.getValue("teacherDisplayName") ||
            row.getValue("displayName") ||
            "Unknown Teacher"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => {
        return <div className="text-center">{t("linkToAssignment")}</div>;
      },
      cell: ({ row }) => {
        const assignment = row.original;
        return (
          <div className="flex justify-center w-24">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(`/student/lesson/${assignment.articleId}`)
              }
            >
              {t("goToLesson")}
            </Button>
          </div>
        );
      },
    },
  ];

  const dueDateColumn = columns.find(
    (col) => "accessorKey" in col && col.accessorKey === "dueDate"
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
    search?: string // เพิ่ม search parameter
  ) => {
    try {
      if (!userId) {
        console.error("Missing required studentId");
        return;
      }

      let url = `/api/v1/users/assignments?studentId=${userId}&page=${page}&limit=10`;

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
          `HTTP ${response.status}: ${errorData.message || "Unknown error"}`
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
        }
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

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/v1/assignment-notifications?studentId=${userId}`
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const notifiedIds = new Set<string>(
            result.data.map((n: any) => n.assignmentId as string)
          );
          setNotifiedAssignmentIds(notifiedIds);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchAssignment(
        currentPage,
        statusFilter,
        dueDateFilter,
        debouncedSearchQuery
      );
      setLoading(false);
    };

    fetchData();
  }, [userId, currentPage, statusFilter, dueDateFilter, debouncedSearchQuery]);

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

  const table = useReactTable({
    data: assignments,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    manualFiltering: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleRowClick = (assignment: Assignment) => {
    if (isMobile) {
      setSelectedAssignment(assignment);
      setIsDialogOpen(true);
    }
  };


  return (
    <div className="flex flex-col gap-4 py-4">
      <Header heading={t("assignments")} />
      <SearchFilterDashboard
        t={t}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        dueDateFilter={dueDateFilter}
        onDueDateFilterChange={handleDueDateFilterChange}
      />
      {searchQuery !== debouncedSearchQuery && (
        <div className="text-sm text-muted-foreground">Searching...</div>
      )}
      <AssignmentTableDashboard
        table={table}
        flexRender={flexRender}
        columnsLength={columns.length}
        loading={loading}
        isMobile={isMobile}
        handleRowClick={handleRowClick}
        pagination={pagination}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        t={t}
      />

      <AssignmentDetailDialog
        assignment={selectedAssignment}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        t={t}
        locale={locale}
      />
    </div>
  );
}
