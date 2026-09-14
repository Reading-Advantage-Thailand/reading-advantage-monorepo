"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Pagination controls exposed to a footer render callback.
 */
export interface DataTablePaginationApi {
  previousPage: () => void;
  nextPage: () => void;
  canPreviousPage: boolean;
  canNextPage: boolean;
  pageIndex: number;
  pageCount: number;
}

/**
 * Column filter controls exposed to a toolbar render callback.
 */
export interface DataTableFilterApi {
  filterValue: string;
  setFilterValue: (value: string) => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  loadingText?: React.ReactNode;
  loadingContent?: React.ReactNode;
  emptyText?: React.ReactNode;
  manualPagination?: boolean;
  manualFiltering?: boolean;
  initialSorting?: SortingState;
  initialColumnVisibility?: VisibilityState;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  filterColumnId?: string;
  toolbar?: React.ReactNode | ((api: DataTableFilterApi) => React.ReactNode);
  footer?: React.ReactNode | ((api: DataTablePaginationApi) => React.ReactNode);
  onRowClick?: (row: TData) => void;
  wrapperClassName?: string;
  tableClassName?: string;
  tableStyle?: React.CSSProperties;
  headerClassName?: string;
  headClassName?: string;
  cellClassName?: string;
  rowClassName?: string;
}

/**
 * Shared react-table shell for admin and teacher tables.
 * @param columns Column definitions.
 * @param data Rows to display.
 * @param loading Whether rows are loading.
 * @param loadingText Loading placeholder.
 * @param emptyText Empty placeholder.
 * @param manualPagination Whether pagination is server-driven.
 * @param manualFiltering Whether filtering is server-driven.
 * @param toolbar Controls rendered above the table.
 * @param footer Controls rendered below the table.
 * @param onRowClick Called when a row is activated.
 * @param wrapperClassName Extra classes for the table wrapper.
 * @param tableClassName Extra classes for the table element.
 * @param headClassName Extra classes for header cells.
 * @param cellClassName Extra classes for body cells.
 * @param rowClassName Extra classes for body rows.
 * @returns The data table.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  loadingText,
  loadingContent,
  emptyText,
  manualPagination = false,
  manualFiltering = false,
  initialSorting = [],
  initialColumnVisibility = {},
  columnVisibility: controlledVisibility,
  onColumnVisibilityChange: controlledOnVisibilityChange,
  filterColumnId,
  toolbar,
  footer,
  onRowClick,
  wrapperClassName = "rounded-md border",
  tableClassName,
  headClassName,
  cellClassName,
  rowClassName,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [internalVisibility, setInternalVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const columnVisibility = controlledVisibility ?? internalVisibility;
  const setColumnVisibility =
    controlledOnVisibilityChange ?? setInternalVisibility;
  const [rowSelection, setRowSelection] = React.useState({});

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
    manualPagination,
    manualFiltering,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const filterApi: DataTableFilterApi = {
    filterValue:
      (filterColumnId
        ? (table.getColumn(filterColumnId)?.getFilterValue() as string)
        : undefined) ?? "",
    setFilterValue: (value: string) => {
      if (filterColumnId) {
        table.getColumn(filterColumnId)?.setFilterValue(value);
      }
    },
  };

  const paginationApi: DataTablePaginationApi = {
    previousPage: () => table.previousPage(),
    nextPage: () => table.nextPage(),
    canPreviousPage: table.getCanPreviousPage(),
    canNextPage: table.getCanNextPage(),
    pageIndex: table.getState().pagination.pageIndex,
    pageCount: table.getPageCount(),
  };

  return (
    <div className="w-full">
      {typeof toolbar === "function" ? toolbar(filterApi) : toolbar}
      <div className={wrapperClassName}>
        <Table className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className={headClassName}>
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
              loadingContent ?? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className={
                      ["h-24 text-center", cellClassName ?? ""]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                  >
                    {loadingText}
                  </TableCell>
                </TableRow>
              )
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={
                    [onRowClick ? "cursor-pointer" : "", rowClassName ?? ""]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row.original);
                          }
                        }
                      : undefined
                  }
                  tabIndex={onRowClick ? 0 : undefined}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={cellClassName}>
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
                  className={
                    ["h-24 text-center", cellClassName ?? ""]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {typeof footer === "function" ? footer(paginationApi) : footer}
    </div>
  );
}
