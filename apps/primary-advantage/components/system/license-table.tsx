"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  CopyIcon,
  MoreHorizontal,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";

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
import { License } from "@prisma/client";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { copyToClipboardWithMeta } from "../ui/copy-button";
import { EditLicenseForm } from "./edit-license-form";
import { Icons } from "@/components/icons";

type LicenseWithSchool = License & {
  School?: {
    id: string;
    name: string;
  } | null;
};

export default function LicenseTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [licenses, setLicenses] = React.useState<LicenseWithSchool[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
  const [openDialogs, setOpenDialogs] = React.useState<{
    edit: string | null;
    delete: string | null;
  }>({
    edit: null,
    delete: null,
  });
  const router = useRouter();

  React.useEffect(() => {
    const fetchLicenses = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/licenses");
        if (response.ok) {
          const data = await response.json();
          setLicenses(data);
        }
      } catch (error) {
        console.error("Failed to fetch licenses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLicenses();
  }, []);

  const columns: ColumnDef<LicenseWithSchool>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            License Name
            <ArrowUpDown />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    // {
    //   accessorKey: "key",
    //   header: "License Key",
    //   cell: ({ row }) => (
    //     <div className="font-mono text-sm">{row.getValue("key")}</div>
    //   ),
    // },
    {
      id: "schoolName",
      header: "School",
      cell: ({ row }) => {
        const school = row.original.School;
        return (
          <div className="text-sm">
            {school ? school.name : "No School (General License)"}
          </div>
        );
      },
    },
    {
      accessorKey: "maxUsers",
      header: () => <div className="text-center">Max Users</div>,
      cell: ({ row }) => {
        const maxUsers = row.getValue("maxUsers") as number;
        return <div className="text-center font-medium">{maxUsers}</div>;
      },
    },
    {
      accessorKey: "subscription",
      header: () => <div className="">Subscription Type</div>,
      cell: ({ row }) => {
        const subscriptionType = row.getValue("subscription") as string;

        return (
          <div className="capitalize">
            <Badge
              variant={
                subscriptionType.toLowerCase() as
                  | "basic"
                  | "premium"
                  | "enterprise"
              }
            >
              {subscriptionType}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => <div className="">Status</div>,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <div className="capitalize">
            <Badge variant={status as "active" | "inactive" | "expired"}>
              {status}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "expiryDate",
      header: () => <div className="text-center">Expiry Date</div>,
      cell: ({ row }) => {
        const expiryDate = row.getValue("expiryDate") as string;
        return (
          <div className="text-center">
            {expiryDate
              ? new Date(expiryDate).toLocaleDateString()
              : "No Expiry"}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const payment = row.original;

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => copyToClipboardWithMeta(payment.key)}
                >
                  <CopyIcon />
                  Copy License
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setOpenDialogs((prev) => ({ ...prev, edit: payment.id }))
                  }
                >
                  <PencilIcon />
                  Edit License
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setOpenDialogs((prev) => ({ ...prev, delete: payment.id }))
                  }
                  className="text-destructive"
                >
                  <TrashIcon className="text-destructive" />
                  Delete License
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit License Dialog */}
            <Dialog
              open={openDialogs.edit === payment.id}
              onOpenChange={(open) => {
                if (!open) {
                  setOpenDialogs((prev) => ({ ...prev, edit: null }));
                }
              }}
            >
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit License</DialogTitle>
                  <DialogDescription>
                    Update the license details and settings
                  </DialogDescription>
                </DialogHeader>
                <EditLicenseForm
                  license={payment}
                  onSuccess={() => {
                    // Close dialog and refresh data
                    setOpenDialogs((prev) => ({ ...prev, edit: null }));
                    // Refetch licenses to show updated data
                    const fetchLicenses = async () => {
                      try {
                        setLoading(true);
                        const response = await fetch("/api/licenses");
                        if (response.ok) {
                          const data = await response.json();
                          setLicenses(data);
                        }
                      } catch (error) {
                        console.error("Failed to fetch licenses:", error);
                      } finally {
                        setLoading(false);
                      }
                    };
                    fetchLicenses();
                  }}
                  onCancel={() => {
                    setOpenDialogs((prev) => ({ ...prev, edit: null }));
                  }}
                />
              </DialogContent>
            </Dialog>

            {/* Delete License Dialog */}
            <AlertDialog
              open={openDialogs.delete === payment.id}
              onOpenChange={(open) => {
                if (!open) {
                  setOpenDialogs((prev) => ({ ...prev, delete: null }));
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete License</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this license{" "}
                    <strong>{payment.name}</strong>?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(payment.id)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting && (
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete License"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        );
      },
    },
  ];

  async function handleDelete(id: string) {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/licenses/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("License deleted successfully");
        const newLicenses = licenses.filter((license) => license.id !== id);
        setLicenses(newLicenses);
        // Close the delete dialog
        setOpenDialogs((prev) => ({ ...prev, delete: null }));
      } else {
        const errorData = await response.json();
        toast.error("Failed to delete license", {
          description:
            errorData.error || "Please try again or contact support.",
        });
      }
    } catch (error) {
      console.error("Error deleting license:", error);
      toast.error("Failed to delete license", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const table = useReactTable({
    data: licenses || [],
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
    <>
      <div className="w-full">
        <div className="flex items-center justify-between py-4">
          <Input
            placeholder="Filter license names..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <Link href="/system/licenses/create-licenses">
            <Button className="ml-auto">Create License</Button>
          </Link>
        </div>
        <div className="overflow-hidden rounded-md border">
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
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
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
    </>
  );
}
