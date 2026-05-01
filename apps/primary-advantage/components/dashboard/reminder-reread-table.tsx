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

interface ReminderRecord {
  id: string;
  title: string;
  scores: string;
  updated_at: string;
  rated: number;
  status: string;
}

export function ReminderRereadTable() {
  const t = useTranslations("Student.history");
  const tStatus = useTranslations("Overall.status");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [data, setData] = React.useState<ReminderRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const user = useCurrentUser();

  // Fetch data function
  const fetchData = React.useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${user.id}/reminder-reread`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
      }
    } catch (error) {
      console.error("Error fetching reminder reread data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch data on component mount and user change
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns: ColumnDef<ReminderRecord>[] = [
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
      header: () => <div>{t("date")}</div>,
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
      <div className="mt-3 mb-4 rounded-md border bg-[#ffedd5] dark:bg-[#7c2d12]">
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
                  {t("noArticlesToRead")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
