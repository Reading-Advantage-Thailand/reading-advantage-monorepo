"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
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
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import ClassroomXPBarChartPerStudents from "../classroom-xp-chart-per-students";
import { format } from "date-fns";

type StudentData = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  cefrLevel: string | null;
  createdAt: string;
  updatedAt: string;
  display_name: string;
  last_activity: string;
};

type ClassroomData = {
  id: string;
  classroomName: string;
  classCode: string;
  teacherId: string;
  archived: boolean;
  grade: string;
  createdAt: string;
  updatedAt: string;
  importedFromGoogle: boolean;
  googleClassroomId: string | null;
};

interface AdminClassroomReportProps {
  classroom: ClassroomData;
  students: StudentData[];
  classroomId: string;
}

export default function AdminClassroomReport({
  classroom,
  students,
  classroomId,
}: AdminClassroomReportProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [xpData, setXpData] = React.useState<any>({});
  const [isClient, setIsClient] = React.useState(false);
  const [activeStudents, setActiveStudents] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);

  const t = useScopedI18n("components.articleRecordsTable");
  const trp = useScopedI18n("components.reports");
  const router = useRouter();

  const fetchXpPerStudents = React.useCallback(
    async (classId: string) => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const res = await fetch(
          `${baseUrl}/api/v1/classroom/xp-per-students/${classId}`,
          {
            method: "GET",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch Classroom XP");

        const data = await res.json();
        setXpData(data);
      } catch (error) {
        console.error("Error fetching Classroom XP:", error);
      }
    },
    [setXpData]
  );

  React.useEffect(() => {
    setIsClient(true);

    // Check if screen is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const active = students.filter((student) => {
      if (!student.last_activity) return false;
      const lastActivity = new Date(student.last_activity);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastActivity > weekAgo;
    }).length;
    setActiveStudents(active);

    // Fetch XP data for the chart
    if (classroomId) {
      fetchXpPerStudents(classroomId);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [students, classroomId, fetchXpPerStudents]);

  // Set column visibility based on screen size
  React.useEffect(() => {
    if (!isClient) return;

    if (isMobile) {
      // On mobile, only show display_name and level
      setColumnVisibility({
        email: false,
        xp: false,
        last_activity: false,
        actions: false, // Hide actions since they're in level column
      });
    } else {
      // On desktop, show all columns
      setColumnVisibility({
        email: true,
        xp: true,
        last_activity: true,
        actions: true,
      });
    }
  }, [isMobile, isClient]);

  const totalStudents = students.length;
  const averageLevel =
    students.length > 0
      ? students.reduce((sum, student) => sum + (student.level || 0), 0) /
        students.length
      : 0;
  const totalXP = students.reduce((sum, student) => sum + (student.xp || 0), 0);

  const columns: ColumnDef<StudentData>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {trp("name")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium ml-2">
          <div>{row.getValue("display_name")}</div>
          {/* Show additional info on mobile */}
          {isMobile && (
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div>{row.getValue("email")}</div>
              <div>
                XP: {(row.getValue("xp") as number)?.toLocaleString() || "0"}
              </div>
              <div>
                Last Activity:{" "}
                {row.getValue("last_activity")
                  ? format(
                      new Date(row.getValue("last_activity") as string),
                      "MMM dd, yyyy"
                    )
                  : "No Activity"}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="lowercase">{row.getValue("email")}</div>
      ),
    },
    {
      accessorKey: "level",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="w-full justify-center"
            >
              {trp("level")}
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary">{row.getValue("level") || 0}</Badge>
          {/* Show mobile actions below level on mobile */}
          {isMobile && (
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/teacher/student-progress/${row.original.id}`)
                }
                className="w-full text-xs"
              >
                {trp("viewDetails")}
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "xp",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="w-full justify-center"
            >
              {trp("xp")}
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const xp = row.getValue("xp") as number;
        return (
          <div className="text-center font-mono">
            {isClient ? xp?.toLocaleString() || "0" : xp || "0"}
          </div>
        );
      },
    },
    {
      accessorKey: "last_activity",
      header: ({ column }) => {
        return (
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="w-full justify-center"
            >
              {trp("lastActivity")}
              <CaretSortIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );
      },
      cell: ({ row }) => {
        const lastActivity = row.getValue("last_activity") as string;
        if (!isClient) {
          return <div className="text-center">Loading...</div>;
        }
        return (
          <div className="text-center">
            {lastActivity
              ? format(new Date(lastActivity), "MMM dd, yyyy")
              : "No Activity"}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">{trp("actions")}</div>,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-center">
            {isMobile ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/teacher/student-progress/${student.id}`)
                }
                className="w-full"
              >
                {trp("viewDetails")}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {trp("actions")}{" "}
                    <ChevronDownIcon className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() =>
                      router.push(`/teacher/student-progress/${student.id}`)
                    }
                  >
                    {trp("viewDetails")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: students,
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

  return (
    <div className="space-y-6">
      {!isClient ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading classroom report...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Back button and header */}
          <div className="flex items-center gap-4">
            <Header
              heading={`${classroom.classroomName} Report`}
              text={`You may view the classroom details here.`}
            />
          </div>

          {/* Classroom Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Classroom Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Classroom Name
                </p>
                <p className="text-lg font-semibold">
                  {classroom.classroomName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Code</p>
                <Badge variant="outline" className="font-mono text-sm">
                  {classroom.classCode}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Grade</p>
                <p className="font-medium">Grade {classroom.grade}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant={classroom.archived ? "destructive" : "default"}>
                  {classroom.archived ? "Archived" : "Active"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-sm">
                  {isClient
                    ? format(new Date(classroom.createdAt), "MMM dd, yyyy")
                    : "Loading..."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Students (7d)
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStudents}</div>
                <p className="text-xs text-muted-foreground">
                  {totalStudents > 0
                    ? Math.round((activeStudents / totalStudents) * 100)
                    : 0}
                  % of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Level
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageLevel.toFixed(1)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isClient ? totalXP.toLocaleString() : totalXP}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4">
                <Input
                  placeholder={trp("search")}
                  value={
                    (table
                      .getColumn("display_name")
                      ?.getFilterValue() as string) ?? ""
                  }
                  onChange={(event) =>
                    table
                      .getColumn("display_name")
                      ?.setFilterValue(event.target.value)
                  }
                  className="w-full md:max-w-sm"
                />
              </div>

              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
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
                          No students found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-end md:space-y-0 md:space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-full md:w-auto"
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-full md:w-auto"
            >
              {t("next")}
            </Button>
          </div>

          {/* XP Chart */}
          <Card>
            <CardContent>
              <ClassroomXPBarChartPerStudents data={xpData} page={"admin"} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
