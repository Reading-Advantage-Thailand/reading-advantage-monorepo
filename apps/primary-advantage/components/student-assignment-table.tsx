"use client";
import React, { act, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronsUpDownIcon } from "lucide-react";
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
import { Header } from "./header";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { enUS, th, zhCN, zhTW, vi } from "date-fns/locale";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AssignmentStatus } from "@prisma/client";
import { useTranslations } from "next-intl";

interface Assignment {
  id: string;
  classroomId: string;
  articleId: string;
  name: string;
  description: string;
  dueDate: string;
  createdAt: string;
  teacherId: string;
  teacherName: string;
}

interface AssignmentStudent {
  id: string;
  studentId: string;
  status: AssignmentStatus;
  startedAt: string;
  assignmentId: string;
  createdAt: string;
  completedAt: string;
  assignment: Assignment;
}

type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
};

export default function StudentAssignmentTable() {
  const [sorting, setSorting] = React.useState<SortingState>([
    {
      id: "createdAt",
      desc: true,
    },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const user = useCurrentUser();

  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      "assignment.description": false,
      createdAt: false,
      "assignment.teacherName": false,
      actions: false,
    });
  const [rowSelection, setRowSelection] = React.useState({});
  const [assignments, setAssignments] = useState<AssignmentStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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
    useState<AssignmentStudent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const t = useTranslations("Assignment.studentAssignmentTable");
  const tComponents = useTranslations("Components");

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

  const getDueDateStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const timeDiff = due.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) {
      return {
        status: "overdue",
        variant: "destructive" as const,
        // text: `${t("overdue")}`,
        text: "Overdue",
      };
    } else if (daysDiff === 0) {
      return {
        status: "today",
        variant: "secondary" as const,
        // text: `${t("dueToday")}`,
        text: "Due Today",
      };
    } else if (daysDiff <= 3) {
      return {
        status: "soon",
        variant: "outline" as const,
        // text: `${t("daysLeft", { daysDiff: daysDiff })}`,
        text: `Days Left: ${daysDiff}`,
      };
    } else {
      return {
        status: "upcoming",
        variant: "default" as const,
        // stext: `${t("daysLeft", { daysDiff: daysDiff })}`,
        text: `Days Left: ${daysDiff}`,
      };
    }
  };

  const columns: ColumnDef<AssignmentStudent>[] = [
    {
      accessorKey: "assignment.name",
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
        const name: string = row.original.assignment.name || "";

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
              {/* {t("dueDate")} */}
              Due Date
              <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const dueDate: string = row.original.assignment.dueDate || "";
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
        const status: AssignmentStatus = row.getValue("status");

        const getStatusIcon = (status: AssignmentStatus) => {
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

        const getStatusText = (status: AssignmentStatus) => {
          switch (status) {
            case AssignmentStatus.NOT_STARTED:
              //   return `${t("notFinished")}`;
              return "Not Finished";
            case AssignmentStatus.IN_PROGRESS:
              //   return `${t("inProgress")}`;
              return "In Progress";
            case AssignmentStatus.COMPLETED:
              //   return `${t("done")}`;
              return "Done";
            default:
              //   return `${t("notFinished")}`;
              return "Not Finished";
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
              onClick={() =>
                (window.location.href = `/student/lesson/${assignment.id}`)
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

  const handleRowClick = (assignment: AssignmentStudent) => {
    if (isMobile) {
      setSelectedAssignment(assignment);
      setIsDialogOpen(true);
    }
  };

  const AssignmentDetailDialog = () => {
    if (!selectedAssignment) return null;

    const dueDateStatus = getDueDateStatus(
      selectedAssignment.assignment.dueDate,
    );

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
          //   return `${t("notFinished")}`;
          return "Not Finished";
        case 1:
          //   return `${t("inProgress")}`;
          return "In Progress";
        case 2:
          //   return `${t("done")}`;
          return "Done";
        default:
          //   return `${t("notFinished")}`;
          return "Not Finished";
      }
    };

    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[90vw] overflow-y-auto sm:max-w-[425px]"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <div className="space-y-4">
            {/* Description */}
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                {/* {t("assignmentDescription")} */}Assignment Description
              </h4>
              <p className="text-sm">
                {selectedAssignment.assignment.description ||
                  "No description provided"}
              </p>
            </div>

            {/* Created Date */}
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                {/* {t("createAt")} */}Create At
              </h4>
              <p className="text-sm">
                {format(
                  new Date(selectedAssignment.createdAt),
                  "MMM dd, yyyy",
                  {
                    locale: enUS,
                  },
                )}
              </p>
            </div>

            {/* Due Date */}
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                {/* {t("dueDate")} */}Due Date
              </h4>
              <div className="flex items-center gap-2">
                <p className="text-sm">
                  {format(
                    new Date(selectedAssignment.assignment.dueDate),
                    "MMM dd, yyyy",
                    {
                      locale: enUS,
                    },
                  )}
                </p>
                {selectedAssignment.status !== AssignmentStatus.COMPLETED && (
                  <Badge variant={dueDateStatus.variant} className="text-xs">
                    {dueDateStatus.text}
                  </Badge>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                {/* {t("status")} */}Status
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {/* {getStatusIcon(selectedAssignment.status as number)} */}
                </span>
                <span className="text-sm">
                  {/* {getStatusText(selectedAssignment.status as number)} */}
                </span>
              </div>
            </div>

            {/* Assigned By */}
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                {t("assignBy")}
              </h4>
              <p className="text-sm">
                {selectedAssignment.assignment.teacherName || "Unknown Teacher"}
              </p>
            </div>

            {/* Action Button */}
            <div className="pt-4">
              <Button
                onClick={() => {
                  window.location.href = `/student/lesson/${selectedAssignment.assignment.id}`;
                }}
                className="w-full"
              >
                {/* {t("goToLesson")} */}Go To Lesson
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

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
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-full">
          <TableHeader className="font-bold">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="px-2 py-3 text-xs sm:text-sm"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => handleRowClick(row.original)}
                  className={isMobile ? "hover:bg-muted/50 cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="px-2 py-3 text-xs sm:text-sm"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-xs sm:text-sm"
                >
                  {loading ? t("loadingAssignments") : t("noAssignmentsFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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

      <AssignmentDetailDialog />
    </div>
  );
}
