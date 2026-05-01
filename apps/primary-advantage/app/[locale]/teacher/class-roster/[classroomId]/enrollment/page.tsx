"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import EnrollmentManagement from "@/components/teacher/enrollment-management";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  grade?: string;
  classCode?: string;
  createdAt: string;
  updatedAt: string;
  students: Array<{
    id: string;
    student: {
      id: string;
      name: string | null;
      email: string | null;
      cefrLevel?: string | null;
      level?: number;
      xp?: number;
    };
  }>;
}

export default function EnrollmentPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.classroomId as string;
  const t = useTranslations("Teacher.Enrollment");

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classroomId) {
      fetchClassroom();
    }
  }, [classroomId]);

  const fetchClassroom = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classroom/${classroomId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classroom");
      }
      const data = await response.json();
      setClassroom(data.classroom);
    } catch (error) {
      console.error("Error fetching classroom:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/teacher/class-roster/${classroomId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          </div>
          <Card>
            <CardHeader>
              <div className="h-6 w-32 animate-pulse rounded bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-full animate-pulse rounded bg-gray-200"
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="container mx-auto p-6">
        <div className="py-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {t("notFound.title")}
          </h3>
          <p className="mb-4 text-gray-500">{t("notFound.description")}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("actions.back")}
          </Button>
        </div>
      </div>
    );
  }

  const enrolledStudents = classroom.students.map((cs) => ({
    ...cs.student,
    enrolled: true as const,
  }));

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button
          onClick={handleBack}
          variant="outline"
          size="sm"
          className="w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("actions.backToRoster")}
        </Button>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            {t("header.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-600 md:text-base">
            {t("header.subtitle")}{" "}
            <span className="font-medium">{classroom.name}</span>
          </p>
        </div>
      </div>

      {/* Enrollment Management Component */}
      <EnrollmentManagement
        classroomId={classroom.id}
        classroomName={classroom.name}
        enrolledStudents={enrolledStudents}
        onStudentEnrolled={fetchClassroom}
        onStudentUnenrolled={fetchClassroom}
        refreshStudents={fetchClassroom}
      />
    </div>
  );
}
