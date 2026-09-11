"use client";
import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import ClassroomXPBarChartPerStudents from "../classroom-xp-chart-per-students";
import ClassroomStudentTable from "../classroom-student-table";
import { format } from "date-fns";

type StudentData = {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  cefrLevel: string | null;
  createdAt: string;
  updatedAt: string;
  display_name: string;
  last_activity: string;
};

type ClassroomData = {
  id: string;
  classroomName: string;
  classCode: string;
  teacherId: string;
  archived: boolean;
  grade: string;
  createdAt: string;
  updatedAt: string;
  importedFromGoogle: boolean;
  googleClassroomId: string | null;
};

interface AdminClassroomReportProps {
  classroom: ClassroomData;
  students: StudentData[];
  classroomId: string;
}

export default function AdminClassroomReport({
  classroom,
  students,
  classroomId,
}: AdminClassroomReportProps) {
  const [xpData, setXpData] = React.useState<any>({});
  const [isClient, setIsClient] = React.useState(false);
  const [activeStudents, setActiveStudents] = React.useState(0);
  const [isMobile, setIsMobile] = React.useState(false);

  const trp = useScopedI18n("components.reports");
  const router = useRouter();

  const fetchXpPerStudents = React.useCallback(
    async (classId: string) => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const res = await fetch(
          `${baseUrl}/api/v1/classroom/xp-per-students/${classId}`,
          {
            method: "GET",
          }
        );
        if (!res.ok) throw new Error("Failed to fetch Classroom XP");

        const data = await res.json();
        setXpData(data);
      } catch (error) {
        console.error("Error fetching Classroom XP:", error);
      }
    },
    [setXpData]
  );

  React.useEffect(() => {
    setIsClient(true);

    // Check if screen is mobile size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const active = students.filter((student) => {
      if (!student.last_activity) return false;
      const lastActivity = new Date(student.last_activity);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return lastActivity > weekAgo;
    }).length;
    setActiveStudents(active);

    // Fetch XP data for the chart
    if (classroomId) {
      fetchXpPerStudents(classroomId);
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, [students, classroomId, fetchXpPerStudents]);

  const totalStudents = students.length;
  const averageLevel =
    students.length > 0
      ? students.reduce((sum, student) => sum + (student.level || 0), 0) /
        students.length
      : 0;
  const totalXP = students.reduce((sum, student) => sum + (student.xp || 0), 0);

  return (
    <div className="space-y-6">
      {!isClient ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading classroom report...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Back button and header */}
          <div className="flex items-center gap-4">
            <Header
              heading={`${classroom.classroomName} Report`}
              text={`You may view the classroom details here.`}
            />
          </div>

          {/* Classroom Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Classroom Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Classroom Name
                </p>
                <p className="text-lg font-semibold">
                  {classroom.classroomName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Code</p>
                <Badge variant="outline" className="font-mono text-sm">
                  {classroom.classCode}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Grade</p>
                <p className="font-medium">Grade {classroom.grade}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant={classroom.archived ? "destructive" : "default"}>
                  {classroom.archived ? "Archived" : "Active"}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-sm">
                  {isClient
                    ? format(new Date(classroom.createdAt), "MMM dd, yyyy")
                    : "Loading..."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudents}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Students (7d)
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStudents}</div>
                <p className="text-xs text-muted-foreground">
                  {totalStudents > 0
                    ? Math.round((activeStudents / totalStudents) * 100)
                    : 0}
                  % of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Level
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageLevel.toFixed(1)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isClient ? totalXP.toLocaleString() : totalXP}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ClassroomStudentTable students={students} variant="admin" />
            </CardContent>
          </Card>

          {/* XP Chart */}
          <Card>
            <CardContent>
              <ClassroomXPBarChartPerStudents data={xpData} page={"admin"} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
