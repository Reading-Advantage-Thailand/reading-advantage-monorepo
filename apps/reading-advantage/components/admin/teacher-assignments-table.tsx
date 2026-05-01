"use client";

import * as React from "react";
import { useScopedI18n } from "@/locales/client";
import { format } from "date-fns";
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
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import {
  BookOpen,
  Users,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Header } from "@/components/header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TeacherAssignmentData = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  classroomId: string;
  classroomName: string;
  grade: number | null;
  assignmentId: string;
  assignmentTitle: string | null;
  assignmentDescription: string | null;
  articleId: string;
  articleTitle: string;
  dueDate: string | null;
  createdAt: string;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  notStartedStudents: number;
};

interface TeacherAssignmentsTableProps {
  initialData?: TeacherAssignmentData[];
}

function TeacherAssignmentsTable({
  initialData = [],
}: TeacherAssignmentsTableProps) {
  const t = useScopedI18n("pages.admin.teacherAssignmentsTable");
  const [data, setData] = React.useState<TeacherAssignmentData[]>(initialData);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [selectedTeacher, setSelectedTeacher] = React.useState<string>("all");
  const [selectedClassroom, setSelectedClassroom] =
    React.useState<string>("all");
  const [isClient, setIsClient] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [selectedAssignment, setSelectedAssignment] =
    React.useState<TeacherAssignmentData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Fetch data from API
  const fetchData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (selectedTeacher !== "all") {
        params.append("teacherId", selectedTeacher);
      }
      if (selectedClassroom !== "all") {
        params.append("classroomId", selectedClassroom);
      }
      params.append("page", currentPage.toString());
      params.append("limit", "20");

      const response = await fetch(
        `/api/v1/admin/teacher-assignments?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch teacher assignments");
      }

      const result = await response.json();
      setData(result.data || []);
    } catch (error) {
      console.error("Error fetching teacher assignments:", error);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeacher, selectedClassroom, currentPage]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  React.useEffect(() => {
    setIsClient(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1025);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  React.useEffect(() => {
    if (!isClient) return;

    if (isMobile) {
      setColumnVisibility({
        grade: false,
        assignmentDescription: false,
        totalStudents: false,
        createdAt: false,
        classroomName: false,
      });
    } else {
      setColumnVisibility({
        grade: true,
        assignmentDescription: false, // Hide by default even on desktop
        totalStudents: true,
        createdAt: true,
        classroomName: true,
      });
    }
  }, [isMobile, isClient]);

  const handleRowClick = (assignment: TeacherAssignmentData) => {
    if (isMobile) {
      setSelectedAssignment(assignment);
      setIsDialogOpen(true);
    }
  };

  // Get unique teachers and classrooms for filters
  const { teachers, classrooms } = React.useMemo(() => {
    const uniqueTeachers = Array.from(
      new Map(
        data.map((item) => [
          item.teacherId,
          { id: item.teacherId, name: item.teacherName },
        ])
      ).values()
    );

    const uniqueClassrooms = Array.from(
      new Map(
        data.map((item) => [
          item.classroomId,
          { id: item.classroomId, name: item.classroomName },
        ])
      ).values()
    );

    return {
      teachers: uniqueTeachers.sort((a, b) => a.name.localeCompare(b.name)),
      classrooms: uniqueClassrooms.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [data]);

  const columns: ColumnDef<TeacherAssignmentData>[] = [
    {
      accessorKey: "teacherName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("teacher")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="ml-4">
          <div className="font-medium">{row.getValue("teacherName")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.teacherEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "classroomName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("classroom")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("classroomName")}</div>
          {row.original.grade && (
            <Badge variant="secondary" className="mt-1">
              {t("gradeLabel", { grade: row.original.grade })}
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: t("grade"),
      cell: ({ row }) => {
        const grade = row.getValue("grade") as number | null;
        return grade ? (
          <Badge variant="secondary">Grade {grade}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "assignmentTitle",
      header: t("assignment"),
      cell: ({ row }) => (
        <div>
          <div className="font-medium max-w-[200px] truncate">
            {row.getValue("assignmentTitle") || t("untitled")}
          </div>
          <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
            {row.original.articleTitle}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "assignmentDescription",
      header: t("description"),
      cell: ({ row }) => (
        <div className="max-w-[400px] text-xs">
          {row.getValue("assignmentDescription") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "totalStudents",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <Users className="mr-2 h-4 w-4" />
            {t("students")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const total = row.original.totalStudents;
        const completed = row.original.completedStudents;
        const inProgress = row.original.inProgressStudents;
        const notStarted = row.original.notStartedStudents;
        const completionRate =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return (
          <div className="text-center">
            <div className="font-bold text-lg">{total}</div>
            <div className="text-xs space-y-1 mt-1">
              <div className="flex items-center justify-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                {completed}
              </div>
              <div className="flex items-center justify-center gap-1 text-yellow-600">
                <Clock className="h-3 w-3" />
                {inProgress}
              </div>
              <div className="flex items-center justify-center gap-1 text-red-600">
                <XCircle className="h-3 w-3" />
                {notStarted}
              </div>
            </div>
            <Badge variant="outline" className="mt-2">
              {t("completePercent", { completionRate })}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {t("dueDate")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        if (!isClient) {
          return <div className="text-sm">{t("loading")}</div>;
        }

        const total = row.original.totalStudents;
        const completed = row.original.completedStudents;
        const completionRate =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        // If 100% complete, show "Complete" badge
        if (completionRate === 100) {
          return (
            <div className="text-sm">
              <Badge
                variant="default"
                className="bg-green-600 hover:bg-green-700"
              >
                {t("completed")}
              </Badge>
            </div>
          );
        }

        const dueDate = row.getValue("dueDate") as string | null;
        if (!dueDate) {
          return (
            <span className="text-muted-foreground">{t("noDueDate")}</span>
          );
        }

        const date = new Date(dueDate);
        const isOverdue = date < new Date();
        const formattedDate = format(date, "MMM dd, yyyy");

        return (
          <div className="text-sm">
            <Badge variant={isOverdue ? "destructive" : "default"}>
              {formattedDate}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("created")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        if (!isClient) {
          return <div className="text-sm">{t("loading")}</div>;
        }

        const date = new Date(row.getValue("createdAt") as string);
        const formattedDate = format(date, "MMM dd, yyyy");
        return <div className="text-sm">{formattedDate}</div>;
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const uniqueTeachers = new Set(data.map((d) => d.teacherId)).size;
    const totalAssignments = data.length;
    const totalStudents = data.reduce((sum, d) => sum + d.totalStudents, 0);
    const totalCompleted = data.reduce(
      (sum, d) => sum + d.completedStudents,
      0
    );
    const overallCompletionRate =
      totalStudents > 0
        ? Math.round((totalCompleted / totalStudents) * 100)
        : 0;

    return {
      uniqueTeachers,
      totalAssignments,
      totalStudents,
      overallCompletionRate,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header heading={t("heading")} text={t("text")} />

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2">
            <Skeleton className="h-10 w-full md:w-[300px]" />
            <Skeleton className="h-10 w-full md:w-[200px]" />
            <Skeleton className="h-10 w-full md:w-[200px]" />
          </div>
          <Skeleton className="h-10 w-[100px] ml-auto" />
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="p-6 space-y-4">
              {/* Table Header Skeleton */}
              <div className="flex items-center space-x-4 pb-4 border-b">
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[120px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>

              {/* Table Rows Skeleton */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="flex items-center space-x-4 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                  <Skeleton className="h-4 w-[150px]" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[120px]" />
                    <Skeleton className="h-5 w-[60px]" />
                  </div>
                  <Skeleton className="h-4 w-[100px]" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                  <div className="space-y-2 text-center">
                    <Skeleton className="h-6 w-[40px] mx-auto" />
                    <Skeleton className="h-3 w-[30px] mx-auto" />
                    <Skeleton className="h-3 w-[30px] mx-auto" />
                    <Skeleton className="h-5 w-[80px] mx-auto" />
                  </div>
                  <Skeleton className="h-6 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <Skeleton className="h-4 w-[200px]" />
          <div className="space-x-2 flex">
            <Skeleton className="h-9 w-[80px]" />
            <Skeleton className="h-9 w-[80px]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header heading={t("heading")} text={t("text")} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalTeachers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.uniqueTeachers}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalAssignments")}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.totalAssignments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("totalStudents")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.totalStudents.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("completionRate")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.overallCompletionRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2">
          <Input
            placeholder={t("searchAssignments")}
            value={
              (table
                .getColumn("assignmentTitle")
                ?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table
                .getColumn("assignmentTitle")
                ?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />

          <Select
            value={selectedTeacher}
            onValueChange={(value) => {
              setSelectedTeacher(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t("filterByTeacher")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {t("teachersCount", { teachersCount: teachers.length })}
                </SelectLabel>
                <SelectItem value="all">{t("allTeachers")}</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select
            value={selectedClassroom}
            onValueChange={(value) => {
              setSelectedClassroom(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder={t("filterByClassroom")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {t("classroomsCount", { classroomsCount: classrooms.length })}
                </SelectLabel>
                <SelectItem value="all">{t("allClassrooms")}</SelectItem>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {!isMobile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                {t("columns")} <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <ScrollArea className="h-full w-full">
              <Table className="min-w-[800px]">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
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
                        className={
                          isMobile ? "cursor-pointer hover:bg-muted/50" : ""
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        {t("noAssignmentsFound")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 py-4">
        <div className="flex-1 text-sm text-muted-foreground text-center md:text-left">
          <span className="hidden md:inline">
            {t("assignmentsSelected", {
              selectedCount: table.getRowModel().rows.length,
              totalCount: table.getFilteredRowModel().rows.length,
            })}
          </span>
          <span className="md:hidden">
            {table.getRowModel().rows.length} /{" "}
            {table.getFilteredRowModel().rows.length}
          </span>
        </div>
        <div className="flex space-x-2 justify-center md:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("previous")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>

      {/* Assignment Detail Dialog for Mobile */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment?.assignmentTitle || t("untitled")}
            </DialogTitle>
            <DialogDescription>
              {t("assignment")} - {selectedAssignment?.articleTitle}
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4 mt-4">
              {/* Teacher Info */}
              <div>
                <h4 className="font-semibold text-sm mb-2">{t("teacher")}</h4>
                <div className="space-y-1 text-sm">
                  <div>{selectedAssignment.teacherName}</div>
                  <div className="text-muted-foreground">
                    {selectedAssignment.teacherEmail}
                  </div>
                </div>
              </div>

              {/* Classroom Info */}
              <div>
                <h4 className="font-semibold text-sm mb-2">{t("classroom")}</h4>
                <div className="space-y-1 text-sm">
                  <div>{selectedAssignment.classroomName}</div>
                  {selectedAssignment.grade && (
                    <Badge variant="secondary">
                      {t("gradeLabel", { grade: selectedAssignment.grade })}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Assignment Description */}
              {selectedAssignment.assignmentDescription && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    {t("description")}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAssignment.assignmentDescription}
                  </p>
                </div>
              )}

              {/* Students Progress */}
              <div>
                <h4 className="font-semibold text-sm mb-2">{t("students")}</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t("totalStudents")}:</span>
                    <span className="font-bold">
                      {selectedAssignment.totalStudents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t("completed")}</span>
                    </div>
                    <span className="font-semibold">
                      {selectedAssignment.completedStudents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Clock className="h-4 w-4" />
                      <span>In Progress</span>
                    </div>
                    <span className="font-semibold">
                      {selectedAssignment.inProgressStudents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>Not Started</span>
                    </div>
                    <span className="font-semibold">
                      {selectedAssignment.notStartedStudents}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Badge
                      variant="outline"
                      className="w-full justify-center py-2"
                    >
                      {t("completePercent", {
                        completionRate:
                          selectedAssignment.totalStudents > 0
                            ? Math.round(
                                (selectedAssignment.completedStudents /
                                  selectedAssignment.totalStudents) *
                                  100
                              )
                            : 0,
                      })}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">{t("dueDate")}</h4>
                  {(() => {
                    const completionRate =
                      selectedAssignment.totalStudents > 0
                        ? Math.round(
                            (selectedAssignment.completedStudents /
                              selectedAssignment.totalStudents) *
                              100
                          )
                        : 0;

                    if (completionRate === 100) {
                      return (
                        <Badge
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {t("completed")}
                        </Badge>
                      );
                    }

                    if (selectedAssignment.dueDate) {
                      return (
                        <Badge
                          variant={
                            new Date(selectedAssignment.dueDate) < new Date()
                              ? "destructive"
                              : "default"
                          }
                        >
                          {format(
                            new Date(selectedAssignment.dueDate),
                            "MMM dd, yyyy"
                          )}
                        </Badge>
                      );
                    }

                    return (
                      <span className="text-sm text-muted-foreground">
                        {t("noDueDate")}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">{t("created")}</h4>
                  <div className="text-sm">
                    {format(
                      new Date(selectedAssignment.createdAt),
                      "MMM dd, yyyy"
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default React.memo(TeacherAssignmentsTable);
