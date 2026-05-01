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
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface School {
  id: string;
  schoolName: string;
  maxUsers: number;
  usedLicenses: number;
}

export type Payment = {
  id: string;
  name: string;
  email: string;
  role: string;
  licenseId: string;
};

export default function UserRoleManagement({
  data,
  page,
  licenseId,
  schoolList,
}: {
  data: Payment[];
  page: string;
  licenseId: string;
  schoolList: School[];
}) {
  const [userData, setUserData] = React.useState<Payment[]>(data);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<string>();
  const [email, setEmail] = React.useState<string>();
  const [currentPayment, setCurrentPayment] = React.useState<Payment>();
  const [isSchoolDialogOpen, setIsSchoolDialogOpen] = React.useState(false);
  const [selectedSchool, setSelectedSchool] = React.useState<string>();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const router = useRouter();
  const [isDisabled, setIsDisabled] = React.useState(false);

  React.useEffect(() => {
    if (!dropdownOpen) {
      setIsDisabled(true);
      const timer = setTimeout(() => {
        setIsDisabled(false);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [dropdownOpen]);

  const handleEditClick = (payment: Payment) => {
    setCurrentPayment(payment);
    setSelectedRole(payment.role);
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${currentPayment?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: selectedRole }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update role.");
      }

      setUserData((prevData) =>
        prevData.map((user) =>
          user.id === currentPayment?.id
            ? { ...user, role: selectedRole! }
            : user
        )
      );

      toast({
        title: "Role updated.",
        description: `Changed role to ${selectedRole}.`,
      });

      setIsEditDialogOpen(false);
    } catch (error) {
      toast({
        title: "An error occurred.",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const handleAddSubmit = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users`,
        {
          method: "PATCH",
          body: JSON.stringify({
            email: email,
            role: selectedRole,
            license_id: licenseId,
          }),
        }
      );

      const data = await response.json();

      if (response.status === 404) {
        toast({
          title: "Error Alert.",
          description: `${data.message}.`,
          variant: "destructive",
        });
      }

      if (response.status === 200) {
        toast({
          title: "User added.",
          description: `Added user with email ${email} and role ${selectedRole}.`,
        });
      }
    } catch (error) {
      toast({
        title: "An error occurred.",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      router.refresh();
    }
  };

  const role =
    page === "system"
      ? [
          { name: "Student", value: "STUDENT" },
          { name: "Teacher", value: "TEACHER" },
          { name: "Admin", value: "ADMIN" },
          { name: "System", value: "SYSTEM" },
        ]
      : [
          { name: "Student", value: "STUDENT" },
          { name: "Teacher", value: "TEACHER" },
          { name: "Admin", value: "ADMIN" },
        ];

  const columns: ColumnDef<Payment & { school_name: string }>[] = [
    {
      accessorKey: "name",
      header: "User Name",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("name") || "No Name"}</div>
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
      accessorKey: "role",
      header: "Current Role",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("role")}</div>
      ),
    },
    {
      accessorKey: "school_name",
      header: "School Name",
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("school_name")}</div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEditClick(payment)}>
                Change Role
              </DropdownMenuItem>
              {page === "system" && (
                <DropdownMenuItem
                  onClick={() => {
                    setCurrentPayment(payment);
                    setIsSchoolDialogOpen(true);
                  }}
                >
                  Change School
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleSchoolChangeSubmit = async () => {
    if (!selectedSchool) {
      toast({
        title: "Error",
        description: "Please select a school before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${currentPayment?.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ license_id: selectedSchool }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update school.");
      }

      const newSchool = schoolList.find((s) => s.id === selectedSchool);

      setUserData((prevData) =>
        prevData.map((user) =>
          user.id === currentPayment?.id
            ? {
                ...user,
                licenseId: selectedSchool,
                school_name: newSchool ? newSchool.schoolName : "-",
              }
            : user
        )
      );

      toast({
        title: "School updated.",
        description: `User is now in ${newSchool?.schoolName || "Unknown"}.`,
      });

      setIsSchoolDialogOpen(false);
    } catch (error) {
      toast({
        title: "An error occurred.",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const mergedUserData = React.useMemo(() => {
    return userData.map((user) => {
      const school = schoolList.find((s) => s.id === user.licenseId);
      return {
        ...user,
        school_name: school ? school.schoolName : "-",
      };
    });
  }, [userData, schoolList]);

  const table = useReactTable({
    data: mergedUserData,
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
    <>
      <div className="w-full">
        <div className="flex items-center py-4">
          <Input
            placeholder="Search users..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("email")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border overflow-x-auto w-full">
          <Table className="w-full table-fixed min-w-[800px] min-h-[320px]">
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
          {licenseId !== "all" && (
            <div className="flex-1 text-sm text-muted-foreground">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="default">Add User</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Add User</AlertDialogTitle>
                    <AlertDialogDescription>
                      <p>Email</p>
                      <Input
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter Email..."
                      />
                      <p>Role</p>
                      <Select onValueChange={(value) => setSelectedRole(value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select a Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {role.map((role, index) => (
                              <SelectItem key={index} value={role.value}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddSubmit}>
                      Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
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

      <AlertDialog
        open={isEditDialogOpen}
        onOpenChange={() => setIsEditDialogOpen(!isEditDialogOpen)}
      >
        <AlertDialogTrigger asChild></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Role</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <p>Role</p>
            <Select
              defaultValue={currentPayment?.role}
              onValueChange={(value) => setSelectedRole(value)}
              onOpenChange={setDropdownOpen}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {role.map((role, index) => (
                    <SelectItem key={index} value={role.value}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDisabled ? "pointer-events-none " : ""}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEditSubmit}
              className={isDisabled ? "pointer-events-none " : ""}
            >
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isSchoolDialogOpen}
        onOpenChange={setIsSchoolDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change School</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <p>Select a new school for this user.</p>
            <Select
              onValueChange={(value) => setSelectedSchool(value)}
              defaultValue={currentPayment?.licenseId}
              onOpenChange={setDropdownOpen}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a School" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {schoolList.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.schoolName}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel
              className={isDisabled ? "pointer-events-none " : ""}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSchoolChangeSubmit}
              className={isDisabled ? "pointer-events-none " : ""}
            >
              Change School
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
