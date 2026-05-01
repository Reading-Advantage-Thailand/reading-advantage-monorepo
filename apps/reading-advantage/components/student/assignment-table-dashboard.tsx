"use client";
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

type Props = {
  table: any;
  flexRender: any;
  columnsLength: number;
  loading: boolean;
  isMobile: boolean;
  handleRowClick: (assignment: any) => void;
  pagination: any;
  onPrevPage: () => void;
  onNextPage: () => void;
  t: any;
};

export default function AssignmentTableDashboard({
  table,
  flexRender,
  columnsLength,
  loading,
  isMobile,
  handleRowClick,
  pagination,
  onPrevPage,
  onNextPage,
  t,
}: Props) {
  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader className="font-bold">
            {table.getHeaderGroups().map((headerGroup: any) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: any) => {
                  return (
                    <TableHead
                      key={header.id}
                      className="px-2 py-3 text-xs sm:text-sm"
                    >
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
              table.getRowModel().rows.map((row: any) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => handleRowClick(row.original)}
                  className={isMobile ? "cursor-pointer hover:bg-muted/50" : ""}
                >
                  {row.getVisibleCells().map((cell: any) => (
                    <TableCell
                      key={cell.id}
                      className="px-2 py-3 text-xs sm:text-sm"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnsLength}
                  className="h-24 text-center text-xs sm:text-sm"
                >
                  {loading ? "Loading assignments..." : "No assignments found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
        <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
          Showing {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalCount)} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} assignments
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevPage}
            disabled={!pagination.hasPrevPage || loading}
            className="text-xs sm:text-sm"
          >
            {t("previous")}
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm whitespace-nowrap">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!pagination.hasNextPage || loading}
            className="text-xs sm:text-sm"
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </>
  );
}
