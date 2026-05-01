"use client";

import * as React from "react";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDate } from "@/lib/utils";

interface ArticleRecord {
  id: string;
  title: string;
  scores: string;
  updated_at: string;
  rated: number;
  status: string;
}

export function ArticleRecordsTable() {
  const t = useTranslations("Student.history");
  const tStatus = useTranslations("Overall.status");
  const tComponents = useTranslations("Components");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<ArticleRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [pagination, setPagination] = React.useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const user = useCurrentUser();

  // Fetch data function
  const fetchData = React.useCallback(
    async (page = 1, search = "") => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const searchParams = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          ...(search && { search }),
        });

        const response = await fetch(
          `/api/users/${user.id}/article-records?${searchParams}`,
        );
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
          setPagination(result.pagination || pagination);
        }
      } catch (error) {
        console.error("Error fetching article records:", error);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, pagination.limit],
  );

  // Fetch data on component mount and user change
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle search with debouncing
  const [searchValue, setSearchValue] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchData(1, searchValue);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchValue, fetchData]);

  const columns: ColumnDef<ArticleRecord>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {t("title")}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="captoliza">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "scores",
      header: () => {
        return <div>{t("score")}</div>;
      },
      cell: ({ row }) => {
        return <div>{row.getValue("scores")}</div>;
      },
    },
    {
      accessorKey: "updated_at",
      header: () => {
        return <div>{t("date")}</div>;
      },
      cell: ({ row }) => {
        const updatedAt = row.getValue("updated_at") as string;
        const date = formatDate(new Date(updatedAt));
        return <div>{date}</div>;
      },
    },
    {
      accessorKey: "rated",
      header: () => <div className="text-center">{t("rated")}</div>,
      cell: ({ row }) => {
        const amount = parseInt(row.getValue("rated"));
        return <div className="text-center font-medium">{amount}</div>;
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const map = {
          READ: tStatus("READ"),
          COMPLETED_MCQ: tStatus("COMPLETED_MCQ"),
          COMPLETED_SAQ: tStatus("COMPLETED_SAQ"),
          COMPLETED_LAQ: tStatus("COMPLETED_LAQ"),
          UNRATED: tStatus("UNRATED"),
        };
        return (
          <div className="text-center font-medium">
            {map[status as keyof typeof map]}
          </div>
        );
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

  const router = useRouter();
  const handleNavigateToArticle = (articleId: string) => {
    router.push(`/student/read/${articleId}`);
  };
  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
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
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("loading")}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="cursor-pointer"
                  onClick={() => handleNavigateToArticle(row.original.id)}
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center"
                >
                  {t("noArticles")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(pagination.page - 1, searchValue)}
            disabled={pagination.page <= 1 || loading}
          >
            {tComponents("previousButton")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(pagination.page + 1, searchValue)}
            disabled={pagination.page >= pagination.totalPages || loading}
          >
            {tComponents("nextButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
