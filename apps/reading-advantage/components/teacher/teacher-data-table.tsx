"use client";
import React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  Row,
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
import { useScopedI18n } from "@/locales/client";

export type TeacherDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  searchColumn?: string;
  searchPlaceholder?: string;
  searchClassName?: string;
  toolbarClassName?: string;
  toolbar?: React.ReactNode | ((table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode);
  loading?: boolean;
  loadingMessage?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  tableFixed?: boolean;
  headerClassName?: string;
  borderClassName?: string;
  tableWrapper?: (table: React.ReactNode) => React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  rowClassName?: string;
  showPagination?: boolean;
  paginationClassName?: string;
  paginationButtonClassName?: string;
  paginationLeft?: React.ReactNode | ((table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode);
  renderPagination?: (table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
};

/**
 * Shared react-table shell for the teacher and history tables.
 * Owns sorting, filtering, visibility, selection, rendering, and pagination.
 * @param props Data, columns, and layout knobs for one table instance.
 * @returns The search bar, bordered table, and pagination controls.
 */
export default function TeacherDataTable<TData>({
  data,
  columns,
  searchColumn,
  searchPlaceholder,
  searchClassName = "max-w-sm",
  toolbarClassName = "flex items-center justify-between",
  toolbar,
  loading = false,
  loadingMessage = "Loading...",
  emptyMessage = "Empty",
  tableFixed = false,
  headerClassName,
  borderClassName = "rounded-md border",
  tableWrapper,
  onRowClick,
  rowClassName,
  showPagination = true,
  paginationClassName = "flex items-center justify-end space-x-2",
  paginationButtonClassName,
  paginationLeft,
  renderPagination,
  columnVisibility: controlledColumnVisibility,
  onColumnVisibilityChange: controlledOnColumnVisibilityChange,
}: TeacherDataTableProps<TData>) {
  const t = useScopedI18n("components.articleRecordsTable");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [internalColumnVisibility, setInternalColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const columnVisibility =
    controlledColumnVisibility ?? internalColumnVisibility;
  const onColumnVisibilityChange =
    controlledOnColumnVisibilityChange ?? setInternalColumnVisibility;
  const toolbarNode =
    typeof toolbar === "function" ? toolbar : toolbar ? () => toolbar : undefined;

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const tableElement = (
    <Table
      style={tableFixed ? { tableLayout: "fixed", width: "100%" } : undefined}
    >
      <TableHeader className={headerClassName}>
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
        {loading ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center"
            >
              {loadingMessage}
            </TableCell>
          </TableRow>
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              className={rowClassName}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              {...(onRowClick
                ? {
                    tabIndex: 0,
                    role: "link",
                    onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    },
                  }
                : {})}
              data-state={row.getIsSelected() && "selected"}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const wrappedTable = tableWrapper ? tableWrapper(tableElement) : tableElement;

  return (
    <>
      {(searchColumn || toolbarNode) && (
        <div className={toolbarClassName}>
          {searchColumn && (
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchColumn)?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn(searchColumn)
                  ?.setFilterValue(event.target.value)
              }
              className={searchClassName}
            />
          )}
          {toolbarNode?.(table)}
        </div>
      )}
      {borderClassName ? (
        <div className={borderClassName}>{wrappedTable}</div>
      ) : (
        wrappedTable
      )}
      {showPagination &&
        (renderPagination ? (
          renderPagination(table)
        ) : (
          <div className={paginationClassName}>
            {typeof paginationLeft === "function"
              ? paginationLeft(table)
              : paginationLeft}
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className={paginationButtonClassName}
              >
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={paginationButtonClassName}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        ))}
    </>
  );
}
