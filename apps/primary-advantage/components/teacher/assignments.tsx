"use client";
import React, { useState, useEffect, useMemo } from "react";
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
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Header } from "@/components/header";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDownIcon } from "lucide-react";

type Assignment = {
  articleId: string;
  meta: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
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

type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
};

interface Classroom {
  id: string;
  name: string;
}

export default function Assignments() {
  const t = useTranslations("Teacher.Assignments");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 10,
  });

  const pathname = usePathname();
  const router = useRouter();

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

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);

  const debouncedSearchQuery = useDebounce(searchQuery, 1000);

  const columns: ColumnDef<Assignment>[] = [
    {
      id: "title",
      accessorFn: (row) => row.meta.title,
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("table.headers.assignment")}
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="ml-4">{row.original.meta.title}</div>,
    },
    {
      accessorKey: "meta.createdAt",
      header: () => (
        <div className="text-center">{t("table.headers.createdOn")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {new Date(row.original.meta.createdAt).toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "meta.dueDate",
      header: () => (
        <div className="text-center">{t("table.headers.dueDate")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          {new Date(row.original.meta.dueDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      accessorKey: "students",
      header: () => (
        <div className="text-center">{t("table.headers.students")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-center">{row.original.students.length}</div>
      ),
    },
    {
      accessorKey: "action",
      header: () => (
        <div className="text-center">{t("table.headers.actions")}</div>
      ),
      cell: ({ row }) => (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" className="ml-auto">
                {t("table.actions.actions")}{" "}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  router.push(`assignments/${row.original.meta.id}`);
                }}
              >
                {t("table.actions.details")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: assignments,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    manualFiltering: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const fetchAssignments = async (
    classroomId: string,
    page: number = 1,
    search?: string,
  ) => {
    setIsLoading(true);
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
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalCount: data.length,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(t("toast.fetchError"), {
        richColors: true,
      });

      setAssignments([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 10,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassChange = async (value: string) => {
    try {
      setSelectedClassroom(value);
      setCurrentPage(1);
      setSearchQuery("");
      await fetchAssignments(value, 1);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error(t("toast.fetchError"), {
        richColors: true,
      });
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchAssignments(selectedClassroom, nextPage, debouncedSearchQuery);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchAssignments(selectedClassroom, prevPage, debouncedSearchQuery);
    }
  };

  useEffect(() => {
    if (selectedClassroom && debouncedSearchQuery !== undefined) {
      setCurrentPage(1);
      fetchAssignments(selectedClassroom, 1, debouncedSearchQuery);
    }
  }, [selectedClassroom, debouncedSearchQuery]);

  useEffect(() => {
    const init = async () => {
      if (!classrooms.length) {
        await fetchClassrooms();
      }

      const pathSegments = pathname.split("/");
      const currentClassroomId = pathSegments[3];

      if (
        currentClassroomId &&
        classrooms.some((c) => c.id === currentClassroomId)
      ) {
        setSelectedClassroom(currentClassroomId);
        await fetchAssignments(currentClassroomId, 1);
      }
    };

    async function fetchClassrooms() {
      const res = await fetch("/api/classroom");
      const data = await res.json();
      setClassrooms(data.classrooms);
    }
    fetchClassrooms();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Header heading={t("heading")} />
        <Select value={selectedClassroom} onValueChange={handleClassChange}>
          <SelectTrigger className="mt-4 h-auto w-[180px]">
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

      <div className="flex items-center justify-between">
        <Input
          placeholder={t("search.placeholder")}
          value={searchQuery}
          onChange={(event) => handleSearchChange(event.target.value)}
          className="max-w-sm"
          disabled={!selectedClassroom || isLoading}
        />

        {searchQuery !== debouncedSearchQuery && (
          <div className="text-muted-foreground text-sm">
            {t("search.searching")}
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="font-bold">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {selectedClassroom ? (
              isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={`loading-${index}`}>
                    <TableCell>
                      <Skeleton className="h-6 w-[250px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-6 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-6 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-6 w-[60px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="mx-auto h-8 w-[100px]" />
                    </TableCell>
                  </TableRow>
                ))
              ) : assignments?.length ? (
                assignments.map((row, index) => (
                  <TableRow key={`${row.articleId}-${index}`}>
                    <TableCell>
                      <div className="ml-4">{row.meta.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        {new Date(row.meta.createdAt).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        {new Date(row.meta.dueDate).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">{row.students.length}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="default" className="ml-auto">
                              {t("table.actions.actions")}
                              <ChevronDownIcon className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => {
                                router.push(`assignments/${row.meta.id}`);
                              }}
                            >
                              {t("table.actions.details")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {t("empty.noAssignments")}
                  </TableCell>
                </TableRow>
              )
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("empty.selectClassroom")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Custom pagination */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {t("pagination.showing", {
            from: Math.min(
              (pagination.currentPage - 1) * pagination.limit + 1,
              pagination.totalCount,
            ),
            to: Math.min(
              pagination.currentPage * pagination.limit,
              pagination.totalCount,
            ),
            total: pagination.totalCount,
          })}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={!pagination.hasPrevPage || isLoading}
          >
            {t("pagination.previous")}
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm">
              {t("pagination.pageOf", {
                page: pagination.currentPage,
                totalPages: pagination.totalPages,
              })}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!pagination.hasNextPage || isLoading}
          >
            {t("pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
