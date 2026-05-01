"use client";

import * as React from "react";
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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

type Payment = {
  id: string;
  schoolName: string;
  maxUsers: number;
  usedLicenses: number;
  //AvailableLicenses: string;
  //utilizationPercentage: string;
};

type LicenseUsageListProps = {
  data: Payment[] | Payment;
};

const isArray = (data: Payment[] | Payment): data is Payment[] => {
  return Array.isArray(data);
};

export const columns: ColumnDef<Payment>[] = [
  {
    accessorKey: "schoolName",
    header: "School Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("schoolName")}</div>
    ),
  },
  {
    accessorKey: "maxUsers",
    header: () => <div className="capitalize text-center">Total Licenses</div>,
    cell: ({ row }) => (
      <div className="lowercase text-center">{row.getValue("maxUsers")}</div>
    ),
  },
  {
    accessorKey: "usedLicenses",
    header: () => <div className="capitalize text-center">Usage Licenes</div>,
    cell: ({ row }) => (
      <div className="lowercase text-center">
        {row.getValue("usedLicenses")}
      </div>
    ),
  },
  {
    accessorKey: "AvailableLicenes",
    header: () => (
      <div className="capitalize text-center">Available Licenes</div>
    ),
    cell: ({ row }) => {
      const total =
        Number(row.getValue("maxUsers")) - Number(row.getValue("usedLicenses"));
      return <div className="lowercase text-center">{total}</div>;
    },
  },
  {
    accessorKey: "utilizationPercentage",
    header: () => (
      <div className="capitalize text-center">Utilization Percentage</div>
    ),
    cell: ({ row }) => {
      const UtilizationRate =
        (Number(row.getValue("usedLicenses")) /
          Number(row.getValue("maxUsers"))) *
        100;
      return (
        <div className="lowercase text-center">
          {UtilizationRate.toFixed(2)}%
        </div>
      );
    },
  },
];

export default function LicesneUsageList({ data }: LicenseUsageListProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const tableData = isArray(data) ? data : [data];

  const table = useReactTable({
    data: tableData,
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
    initialState: {
      //This line
      pagination: {
        pageSize: 5,
      },
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Search schools..."
          value={
            (table.getColumn("schoolName")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("schoolName")?.setFilterValue(event.target.value)
          }
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        {/* <div className="flex-1 text-sm text-muted-foreground">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default">Download Report</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div> */}
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
