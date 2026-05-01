"use client";

import * as React from "react";
import { useEffect } from "react";
import {
  CaretSortIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
} from "@radix-ui/react-icons";
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import { ArticleRecord } from "@/types";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { RecordStatus } from "@/types/constants";
import { useScopedI18n } from "@/locales/client";

interface ReminderRereadTableProps {
  articles: ArticleRecord[];
  isLoading?: boolean;
  error?: string;
}
export function ReminderRereadTable({
  articles,
  isLoading = false,
  error,
}: ReminderRereadTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const t = useScopedI18n("components.history.reminder");
  const router = useRouter();

  const handleNavigateToArticle = (articleId: string) => {
    router.push(`/student/read/${articleId}`);
  };

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
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="captoliza">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "created_at",
      header: () => <div>{t("date")}</div>,
      cell: ({ row }) => {
        const createdAt = row.getValue("created_at") as string;
        const date = formatDate(createdAt);
        return <div>{date}</div>;
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="text-center">{t("status")}</div>,
      cell: ({ row }) => {
        const status = row.getValue("status") as RecordStatus;
        const statusMap = {
          [RecordStatus.COMPLETED]: "Complete",
          [RecordStatus.UNRATED]: "In Progress",
          [RecordStatus.UNCOMPLETED_MCQ]: "In Progress",
          [RecordStatus.UNCOMPLETED_SHORT_ANSWER]: "In Progress",
        };
        return (
          <div className="text-center font-medium">
            {statusMap[status] || "In Progress"}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: articles,
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

  if (error) {
    return (
      <div className="w-full p-4 text-center text-red-500">
        <p>Error loading reminder articles: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full p-4 text-center">
        <p>Loading reminder articles...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-md border mt-3 mb-4 bg-[#ffedd5] dark:bg-[#7c2d12]">
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
                  className="cursor-pointer"
                  onClick={() =>
                    handleNavigateToArticle(
                      row.original.targetId
                        ? row.original.targetId
                        : row.original.articleId
                    )
                  }
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
                  className="h-24 text-center text-muted-foreground"
                >
                  {articles.length === 0
                    ? "Great! No incomplete articles."
                    : "No articles match your current filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
