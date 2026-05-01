"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Users,
  GraduationCap,
  Plus,
  ArrowRight,
  BookOpen,
  Calendar,
} from "lucide-react";
import CreateNewClass from "./create-classes";

interface Classroom {
  id: string;
  name: string;
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
    };
  }>;
}

export default function ClassroomSelector() {
  const router = useRouter();
  const t = useTranslations("Teacher.ClassroomSelector");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/classroom");
      if (!response.ok) {
        throw new Error("Failed to fetch classrooms");
      }
      const data = await response.json();
      setClassrooms(data.classrooms || []);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      toast.error(t("toast.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomClick = (classroomId: string) => {
    router.push(`/teacher/class-roster/${classroomId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (classrooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            {t("empty.title")}
          </h3>
          <p className="mb-4 text-gray-500">{t("empty.description")}</p>
          <CreateNewClass
            buttonText={t("empty.createFirst")}
            onClassCreated={fetchClassrooms}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <CreateNewClass
          buttonText={t("actions.newClassroom")}
          onClassCreated={fetchClassrooms}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classrooms.map((classroom) => (
          <Card
            key={classroom.id}
            className="cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-md"
            onClick={() => handleClassroomClick(classroom.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="line-clamp-2 text-lg">
                    {classroom.name}
                  </CardTitle>
                  {classroom.grade && (
                    <CardDescription className="mt-1">
                      {t("grade", { grade: classroom.grade })}
                    </CardDescription>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1" />
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-3">
                {/* Student count */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4" />
                  <span>
                    {t("studentsCount", { count: classroom.students.length })}
                  </span>
                </div>

                {/* Class code */}
                {classroom.classCode && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <GraduationCap className="mr-1 h-3 w-3" />
                      {classroom.classCode}
                    </Badge>
                  </div>
                )}

                {/* Creation date */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {t("createdAt", { date: formatDate(classroom.createdAt) })}
                </div>

                {/* Quick stats */}
                <div className="border-t border-gray-100 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClassroomClick(classroom.id);
                    }}
                  >
                    {t("actions.viewRoster")}
                    <ArrowRight className="ml-auto h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
