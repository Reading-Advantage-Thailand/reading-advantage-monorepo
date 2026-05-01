"use client";
import React, { useState, useEffect } from "react";
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
import { ChevronsUpDownIcon, ChevronDownIcon } from "lucide-react";
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
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icons } from "@/components/icons";
import { Header } from "@/components/header";
import { toast } from "sonner";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StudentEnrollmentButton from "./student-enrollment-button";
import StudentUnenrollmentButton from "./student-unenrollment-button";

type StudentData = {
  id: string;
  display_name: string;
  email: string;
  last_activity: string;
};

interface Classes {
  classroomName: string;
  classCode: string;
  noOfStudents: number;
  grade: string;
  coTeacher: {
    coTeacherId: string;
    name: string;
  };
  id: string;
  archived: boolean;
  title: string;
  student: [
    {
      studentId: string;
      lastActivity: Date;
    },
  ];
  importedFromGoogle: boolean;
  alternateLink: string;
  googleClassroomId: string;
}

export default function ClassRoster() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  // const t = useScopedI18n("components.articleRecordsTable");
  // const tr = useScopedI18n("components.classRoster");
  // const ts = useScopedI18n("components.myStudent");
  const router = useRouter();
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  // const { classrooms, fetchClassrooms } = useClassroomStore();
  const [loading, setLoading] = useState<boolean>(false);
  const pathname = usePathname();
  const [classroomId, setClassroomId] = useState<string>("");
  const [classes, setClasses] = useState<Classes>({} as Classes);
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [studentInClass, setStudentInClass] = useState<StudentData[]>([]);

  const handleResetProgress = async (selectedStudentId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/${selectedStudentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            xp: 0,
            level: 0,
            cefr_level: "",
          }),
        },
      );
      if (!response.ok) {
        toast.error("XP reset failed");
      } else {
        toast.success("XP reset successfully");
      }
    } catch (error) {
      toast.error("XP reset failed");
    } finally {
      router.refresh();
      setIsResetModalOpen(false);
    }
  };

  const columns: ColumnDef<StudentData>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="captoliza ml-4">{row.getValue("display_name")}</div>
      ),
    },
    {
      accessorKey: "last_activity",
      header: () => {
        return <div className="text-center">Last Activity</div>;
      },
      cell: ({ row }) => {
        return (
          <div className="captoliza text-center">
            {row.getValue("last_activity")
              ? new Date(row.getValue("last_activity")).toLocaleString()
              : "No Activity"}
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: () => {
        return <div className="text-center">Actions</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="flex items-center justify-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Actions <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/student-progress/${payment.id}`,
                    )
                  }
                >
                  Progress
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setSelectedStudentId(payment.id);
                  }}
                >
                  Reset Progress
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {classes?.id && (
              <StudentUnenrollmentButton
                student={{
                  id: payment.id,
                  name: payment.display_name,
                  email: payment.email,
                }}
                classroomId={classes.id}
                classroomName={classes.classroomName || "Classroom"}
                onStudentUnenrolled={() => {
                  // Refresh the student list
                  if (classes.id) {
                    fetchStudentInClass(classes.id);
                  }
                }}
                buttonSize="sm"
              />
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: studentInClass,
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

  const syncStudents = async (courseId: string) => {
    setLoading(true);

    try {
      const lastUrl = window.location.pathname;
      const response = await fetch(
        `/api/classroom/oauth2/classroom/courses/${courseId}?redirect=${encodeURIComponent(
          lastUrl,
        )}`,
        {
          method: "GET",
        },
      );

      const data = await response.json();

      if (response.ok && !data.authUrl) {
        toast.success("Students synced successfully");
      } else if (response.status === 401) {
        toast.error("No student in class");
      } else {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
    setLoading(false);
  };

  // useEffect(() => {
  //   if (classrooms.length) {
  //     const pathSegments = pathname.split("/");
  //     const currentClassroomId = pathSegments[4];
  //     setClassroomId(currentClassroomId);

  //     if (
  //       currentClassroomId &&
  //       classrooms.some((c) => c.id === currentClassroomId)
  //     ) {
  //       setSelectedClassroom(currentClassroomId);
  //       fetchStudentInClass(currentClassroomId);
  //     } else {
  //       setClasses({} as Classes);
  //       setSelectedClassroom("");
  //       setStudentInClass([]);
  //     }
  //   }
  // }, [pathname, classrooms]);

  // useEffect(() => {
  //   if (!classrooms.length) {
  //     fetchClassrooms();
  //   }
  // }, []);

  const fetchStudentInClass = async (classId: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/classroom/${classId}`,
        {
          method: "GET",
        },
      );
      if (!res.ok) throw new Error("Failed to fetch Classroom list");

      const data = await res.json();
      setStudentInClass(data.studentInClass);
      setClasses(data.classroom);
    } catch (error) {
      console.error("Error fetching Classroom list:", error);
    }
  };

  const handleClassChange = async (value: string) => {
    try {
      setSelectedClassroom(value);

      await fetchStudentInClass(value);
      router.push(`/teacher/class-roster/${value}`);
    } catch (error) {
      console.error("Error fetching Classroom list:", error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        {/* <Select value={selectedClassroom} onValueChange={handleClassChange}>
          <SelectTrigger className="mt-4 h-auto w-[180px]">
            <SelectValue placeholder="Select a Classroom" />
          </SelectTrigger>
          <SelectContent className="max-h-48 overflow-y-auto">
            {classrooms?.map((classroom, index) => (
              <SelectItem key={index} value={classroom.id}>
                {classroom.classroomName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
      </div>
      {/* {classes &&
        (studentInClass.length ? (
          <Header heading={classes.classroomName} />
        ) : (
          <Header heading="No Student" />
        ))} */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search"
          value={
            (table.getColumn("display_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("display_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          {classes?.id && (
            <StudentEnrollmentButton
              classroomId={classes.id}
              classroomName={classes.classroomName || "Classroom"}
              onStudentEnrolled={() => {
                // Refresh the student list
                if (classes.id) {
                  fetchStudentInClass(classes.id);
                }
              }}
              buttonText="Enroll Student"
              buttonSize="sm"
            />
          )}
        </div>
        {/* {selectedClassroom &&
          classroomId &&
          (!classes.importedFromGoogle ? (
            <Button
              variant="outline"
              onClick={() => {
                if (classroomId) {
                  router.push(
                    `/teacher/class-roster/${classroomId}/create-new-student`,
                  );
                } else {
                  toast.error("Classroom ID is not available.");
                }
              }}
            >
              <Icons.add />
              Add Student
            </Button>
          ) : (
            <Button
              onClick={() => syncStudents(classes.googleClassroomId)}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Sync students
                </>
              ) : (
                <>
                  <Image
                    className="mr-2"
                    src={"/96x96_yellow_stroke_icon@1x.png"}
                    alt="google-classroom"
                    width={20}
                    height={20}
                  />
                  Sync students
                </>
              )}
            </Button>
          ))} */}
      </div>
      <div className="rounded-md border">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="font-bold">
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
                  Empty
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
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
      <Dialog
        open={isResetModalOpen}
        onOpenChange={() => setIsResetModalOpen(!isResetModalOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Progress</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to reset the progress of this student?
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              // onClick={() => handleResetProgress(selectedStudentId)}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
