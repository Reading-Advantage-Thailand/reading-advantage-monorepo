"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { ColumnDef } from "@tanstack/react-table";
import { Header } from "../header";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "../ui/use-toast";
import { useClassroomStore } from "@/store/classroom-store";
import TeacherDataTable from "./teacher-data-table";

type Student = {
  id: string;
  email: string;
  name: string;
};

export default function MyStudents() {
  const ts = useScopedI18n("components.myStudent");
  const router = useRouter();
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom/students`,
          { method: "GET" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch students list");
        }

        const studentsData = await response.json();
        setStudents(studentsData.students || []);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast({
          title: "Error",
          description: "Failed to load students. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const handleResetProgress = async (selectedStudentId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${selectedStudentId}/reset-all-progress`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Student progress reset successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to reset student progress.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast({
        title: "Error",
        description: "Failed to reset student progress.",
        variant: "destructive",
      });
    } finally {
      router.refresh();
      setIsResetModalOpen(false);
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {ts("name")}
            <CaretSortIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const studentName: string = row.getValue("name");
        return (
          <div className="ml-4">
            {studentName ? studentName : "Anonymous"}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: () => {
        return <div>{ts("email")}</div>;
      },
      cell: ({ row }) => {
        const studentEmail: string = row.getValue("email");
        return (
          <div>
            {studentEmail ? studentEmail : "Unknown"}
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: () => {
        return <div className="text-center">{ts("actions")}</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="ml-auto">
                  {ts("actions")} <ChevronDownIcon className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/teacher/student-progress/${payment.id}`
                    )
                  }
                >
                  {ts("progress")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/teacher/enroll-classes/${payment.id}`
                    )
                  }
                >
                  {ts("enroll")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/teacher/unenroll-classes/${payment.id}`
                    )
                  }
                >
                  {ts("unEnroll")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setSelectedStudentId(payment.id);
                  }}
                >
                  {ts("resetProgress")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="flex flex-col gap-4">
        <Header heading={ts("title")} />
        <TeacherDataTable
          data={students}
          columns={columns}
          searchColumn="name"
          searchPlaceholder={ts("searchName")}
          loading={isLoading}
          loadingMessage="Loading students..."
          tableFixed
          headerClassName="font-bold"
          emptyMessage="No students found with your license"
        />
      </div>
      <Dialog
        open={isResetModalOpen}
        onOpenChange={() => setIsResetModalOpen(!isResetModalOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ts("resetTitle")}</DialogTitle>
            <DialogDescription>{ts("resetDescription")}</DialogDescription>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsResetModalOpen(false)}
              >
                {ts("cancelReset")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResetProgress(selectedStudentId)}
              >
                {ts("reset")}
              </Button>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
