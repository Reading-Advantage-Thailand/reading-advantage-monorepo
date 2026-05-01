"use client";
import React, { useEffect, useState } from "react";
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
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
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
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";
import CreateNewClass from "./create-new-class";
import EditClass from "./edit-class";
import DeleteClass from "./delete-class";
import ArchiveClass from "./archive-class";
import { Header } from "../header";
import { useCourseStore, useClassroomStore } from "@/store/classroom-store";
import { Icons } from "@/components/icons";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Checkbox } from "../ui/checkbox";
import { ScrollArea } from "../ui/scroll-area";
import { classroom_v1 } from "googleapis";
import Link from "next/link";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { cn } from "@/lib/utils";
import { array } from "zod";
import { ClassroomTeachers } from "@/components/classroom-teachers";

type Classes = {
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
  student: {
    studentId: string;
    email?: string;
    lastActivity: Date | string;
  }[];
  importedFromGoogle: boolean;
  alternateLink: string;
  isOwner?: boolean;
};

type Schema$Course = classroom_v1.Schema$Course;

type CourseWithCount = Schema$Course & {
  studentCount?: any[];
};

export default function MyClasses() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const t = useScopedI18n("components.articleRecordsTable");
  const tc = useScopedI18n("components.myClasses");
  const router = useRouter();
  const { courses, setCourses, selectedCourses, setSelectedCourses } =
    useCourseStore();
  const { classrooms, fetchClassrooms } = useClassroomStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [coursesOpen, setCoursesOpen] = useState<boolean>(false);
  const [importState, setImportState] = useState(0);
  const [selected, setSelected] = useState("");
  const [isTeachersOpen, setIsTeachersOpen] = useState<boolean>(false);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>("");

  const columns: ColumnDef<Classes>[] = [
    {
      accessorKey: "classroomName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {tc("className")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const classroomName: string = row.getValue("classroomName");
        const checkImported = row.original.importedFromGoogle;
        return (
          <div className="captoliza ml-4 flex gap-4">
            {classroomName ? classroomName : "Unknown"}{" "}
            {checkImported ? (
              <Link href={row.original.alternateLink} target="_blank">
                <Image
                  src={"/96x96_yellow_stroke_icon@1x.png"}
                  alt="google-classroom"
                  width={20}
                  height={20}
                />
              </Link>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "classCode",
      header: () => {
        return <div className="text-center">{tc("classCode")}</div>;
      },
      cell: ({ row }) => (
        <div className="captoliza text-center">{row.getValue("classCode")}</div>
      ),
    },
    {
      accessorKey: "student.lenght",
      header: () => {
        return <div className="text-center">{tc("studentCount")}</div>;
      },
      cell: ({ row }) => (
        <div className="captoliza text-center">
          {row.original?.student?.length || 0}
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: () => {
        return <div className="text-center">{tc("actions")}</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="ml-auto">
                  {tc("actions")} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/class-roster/${payment.id}`
                    )
                  }
                >
                  {tc("roster")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `${process.env.NEXT_PUBLIC_BASE_URL}/teacher/reports/${payment.id}`
                    )
                  }
                >
                  {tc("reports")}
                </DropdownMenuItem>
                {payment.isOwner && (
                  <DropdownMenuItem
                    onClick={() => {
                      setIsTeachersOpen(true);
                      setSelectedClassroomId(payment.id);
                    }}
                  >
                    Manage Teachers
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
    {
      accessorKey: "detail",
      header: () => {
        return <div className="text-center">{tc("detail")}</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;

        return (
          <div className="captoliza justify-center flex gap-2">
            {payment.importedFromGoogle ? null : (
              <EditClass classroomData={payment} />
            )}
            <ArchiveClass classroomData={payment} />
            <DeleteClass classroomData={payment} />
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const table = useReactTable({
    data: classrooms,
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

  const syncClassroom = async () => {
    setLoading(true);
    try {
      const lastUrl = window.location.pathname;
      const response = await fetch(
        `/api/v1/classroom/oauth2/classroom/courses?redirect=${encodeURIComponent(
          lastUrl
        )}`,
        {
          method: "GET",
        }
      );

      const data = await response.json();

      if (response.ok && data.courses) {
        const newCourses = data.courses.filter(
          (course: Schema$Course) =>
            !classrooms.some((cls) => cls.googleClassroomId === course.id)
        );
        setImportState(0);
        setCourses(newCourses);
        setCoursesOpen(true);
      } else {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
    setLoading(false);
  };

  async function handleImportCourses() {
    try {
      setImportState(1);
      const newCourses = courses.filter((course) => course.id === selected);
      setSelectedCourses(newCourses);

      const res = await fetch(`/api/v1/classroom`, {
        method: "POST",
        body: JSON.stringify({ courses: newCourses }),
      });

      if (res.ok) {
        setImportState(2);
        fetchClassrooms();
      }
    } catch (error) {
      console.error("Error importing courses:", error);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Header heading={tc("title")} />
        <div className="flex justify-between items-end">
          <Input
            placeholder={tc("search")}
            value={
              (table.getColumn("classroomName")?.getFilterValue() as string) ??
              ""
            }
            onChange={(event) =>
              table
                .getColumn("classroomName")
                ?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
          <div className="flex items-end space-x-2">
            <div className="flex-col space-y-2">
              <p className="text-xs opacity-70">Import a new class from</p>
              <Button onClick={() => syncClassroom()} disabled={loading}>
                {loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Google Classroom
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
                    Google Classroom
                  </>
                )}
              </Button>
            </div>
            <CreateNewClass />
          </div>
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
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={coursesOpen} onOpenChange={setCoursesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <h1 className="text-2xl">Import Your Google Classroom</h1>
            </DialogTitle>
          </DialogHeader>
          <ImportStateSlider currentLevel={importState} />

          <div className="border rounded-lg overflow-hidden shadow-md">
            {importState === 0 && (
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Select a Google Classroom Class
                </h2>
                <p className="mb-6">
                  Choose a class to sync with Reading Advantage. All students
                  will be imported and added to your account.
                </p>
                <div className="mb-6">
                  <label className="text-sm font-medium mb-1 block">
                    Your Google Classroom Classes
                  </label>
                  {courses.length ? (
                    <ScrollArea className="h-52">
                      <RadioGroup value={selected} onValueChange={setSelected}>
                        {courses.map((data: CourseWithCount, i) => (
                          <div
                            key={i}
                            onClick={() => setSelected(data.id as string)}
                            className={cn(
                              "flex items-center cursor-pointer justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground",
                              selected === data.id ? "border-primary" : ""
                            )}
                          >
                            <h3 className="font-medium">
                              {data.name}
                            </h3>
                            <div className="flex items-center text-gray-500 text-sm">
                              <Icons.student width={16} height={16} />
                              <span>
                                {data?.studentCount?.length ?? 0} students
                              </span>
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </ScrollArea>
                  ) : (
                    <p>No courses found</p>
                  )}
                </div>
                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <Button
                    className="flex gap-2"
                    variant="outline"
                    onClick={() => syncClassroom()}
                    disabled={loading}
                  >
                    <Icons.Refresh
                      width={16}
                      height={16}
                      className={loading ? "animate-spin" : ""}
                    />
                    Refresh
                  </Button>
                  <Button
                    onClick={() => handleImportCourses()}
                    disabled={!selected}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
            {importState === 1 && (
              <div className="p-6 flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
                <h2 className="text-xl font-semibold mb-2">Syncing Class...</h2>
                <p className="text-gray-600 text-center max-w-md">
                  Importing students from Google Classroom. This may take a
                  moment.
                </p>
              </div>
            )}
            {importState === 2 && (
              <div className="p-6">
                <div className="flex justify-center mb-6">
                  <div className="bg-green-200 rounded-full p-3">
                    <Icons.CircleCheckBig width={40} height={40} />
                  </div>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-center">
                  Sync Completed!
                </h2>
                {selectedCourses.map((course: CourseWithCount) => (
                  <>
                    <p className="text-gray-600 text-center mb-6 ">
                      Successfully imported {course?.studentCount?.length ?? 0}{" "}
                      students from {course.name}.
                    </p>
                    <div className="rounded-md border p-4 mb-6">
                      <h3 className="font-medium mb-2">Students Added</h3>
                      {course?.studentCount?.length ? (
                        <ScrollArea className="h-40">
                          <ul className="space-y-2">
                            {course?.studentCount.map((data, index) => (
                              <li key={index} className="flex items-center">
                                <div className="border rounded-full w-8 h-8 flex items-center justify-center mr-2">
                                  <Icons.UserRound width={16} height={16} />
                                </div>
                                <span>{data?.profile.name.fullName}</span>
                                <span className="ml-auto text-green-600 text-sm">
                                  New
                                </span>
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      ) : (
                        <p>No students found</p>
                      )}
                    </div>
                  </>
                ))}

                <div className="flex justify-between pt-4 border-t border-gray-200">
                  <Button
                    className="flex gap-2"
                    variant="outline"
                    onClick={() => {
                      setSelected("");
                      syncClassroom();
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : null}
                    Sync Another Class
                  </Button>
                  <Button
                    onClick={() => {
                      setImportState(0);
                      setSelected("");
                      setCoursesOpen(false);
                    }}
                  >
                    Go to Class
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <div className="border rounded-md p-4">
              <h3 className="font-medium mb-1 flex gap-2 items-center">
                <Icons.CircleAlert width={16} height={16} /> About Google
                Classroom Sync
              </h3>
              <p className="text-sm">
                This feature allows teachers to easily import their Google
                Classroom students into Reading Advantage. Students will be
                automatically enrolled in your class.
              </p>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isTeachersOpen} onOpenChange={setIsTeachersOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Teachers</DialogTitle>
          </DialogHeader>
          {selectedClassroomId && (
            <ClassroomTeachers 
              classroomId={selectedClassroomId} 
              isCreator={(classrooms.find(c => c.id === selectedClassroomId) as any)?.isOwner || false}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImportStateSlider({ currentLevel }: { currentLevel: number }) {
  const State = [
    { no: 1, name: "Select Class" },
    { no: 2, name: "Syncs Students" },
    { no: 3, name: "Complete" },
  ];
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {State.map((level, index) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                index === currentLevel
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {level.no}
            </div>
            <span>{level.name}</span>
          </div>
        ))}
      </div>
      <div className="h-2 bg-muted rounded-full">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300 ease-in-out"
          style={{
            width: `${(currentLevel / (State.length - 1)) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
}
