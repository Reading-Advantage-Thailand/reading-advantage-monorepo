import React from "react";
import CreateNewStudent from "@/components/teacher/create-new-student";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AddNewStudent({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }

  const ClassesData = async () => {
    const requestHeaders = await headers();
    const resClass = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom`,
      { method: "GET", headers: requestHeaders }
    );
    if (!resClass.ok) throw new Error("Failed to fetch ClassesData list");
    const ClassroomData = await resClass.json();

    const resStudent = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom/students`,
      { method: "GET", headers: requestHeaders }
    );
    if (!resStudent.ok) throw new Error("Failed to fetch StudentData list");

    const studentsData = await resStudent.json();

    const classData = ClassroomData.data.find(
      (classroom: { id: string }) => classroom.id === classroomId
    );

    const classsData = ClassroomData.data.filter(
      (classroom: { id: string }) => classroom.id === classroomId
    );

    const studentsMapped = studentsData.students;

    const StudentId: string[] = classsData.flatMap((classroom: any) =>
      classroom.student.map((student: any) => student.studentId)
    );

    const studentDataInClass = studentsData.students.filter(
      (entry: { id: string }) => StudentId.includes(entry.id)
    );

    return { classData, studentsMapped, studentDataInClass };
  };

  const allStudentEmailData = async () => {
    const requestHeaders = await headers();
    const resStudent = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom/all-students`,
      { method: "GET", headers: requestHeaders }
    );
    if (!resStudent.ok) throw new Error("Failed to fetch ClassesData list");
    const allStudentEmail = await resStudent.json();

    return allStudentEmail;
  };

  const allStudentEmail = await allStudentEmailData();
  const classData = await ClassesData();
  
  return (
    <>
      <CreateNewStudent
        studentDataInClass={classData.studentDataInClass}
        allStudentEmail={allStudentEmail.students}
        classrooms={classData.classData}
      />
    </>
  );
}
