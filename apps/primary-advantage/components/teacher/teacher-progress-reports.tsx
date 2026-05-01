"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { UserActivityChart } from "@/components/dashboard/user-activity-chart";
import { UserXpOverAllChart } from "@/components/dashboard/user-xpoverall-chart";
import ReadingStatsChart from "@/components/dashboard/user-reading-chart";
import UserActivityHeatMap from "@/components/dashboard/user-heatmap-chart";
import CEFRLevels from "@/components/dashboard/user-level-indicator";
import UserRecentActivity from "@/components/dashboard/user-recent-activity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, BookOpen, TrendingUp, Clock } from "lucide-react";
import { User } from "next-auth";

interface Classroom {
  id: string;
  name: string;
  classCode: string;
  grade?: string;
  studentsEnrolled?: number;
}

interface Student {
  id: string;
  display_name: string;
  email: string;
  cefrLevel?: string;
  xp?: number;
  lastActivity?: Date;
  classrooms?: Array<{
    id: string;
    name: string;
    teacher?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface TeacherProgressReportsProps {
  classrooms: Classroom[];
  students: Student[];
  currentUser: User;
}

export default function TeacherProgressReports({
  classrooms,
  students,
  currentUser,
}: TeacherProgressReportsProps) {
  const t = useTranslations("Reports");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter students based on selected classroom
  const filteredStudents = React.useMemo(() => {
    let filtered = students;

    if (selectedClassroom !== "all") {
      filtered = students.filter((student) =>
        student.classrooms?.some(
          (classroom) => classroom.id === selectedClassroom,
        ),
      );
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.display_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  }, [students, selectedClassroom, searchTerm]);

  // Calculate aggregate statistics
  const classroomStats = React.useMemo(() => {
    const totalStudents = filteredStudents.length;
    const avgXp =
      filteredStudents.reduce((sum, student) => sum + (student.xp || 0), 0) /
        totalStudents || 0;

    const levelCounts = filteredStudents.reduce(
      (acc, student) => {
        const level = student.cefrLevel || "A0";
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommonLevel =
      Object.entries(levelCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "A0";

    const recentlyActive = filteredStudents.filter((student) => {
      if (!student.lastActivity) return false;
      const daysSince =
        (Date.now() - new Date(student.lastActivity).getTime()) /
        (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    }).length;

    return {
      totalStudents,
      avgXp: Math.round(avgXp),
      mostCommonLevel,
      levelCounts,
      recentlyActive,
      activeRate:
        totalStudents > 0
          ? Math.round((recentlyActive / totalStudents) * 100)
          : 0,
    };
  }, [filteredStudents]);

  // Fetch individual student data when selected
  const fetchStudentData = async (studentId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${studentId}/article-records`);
      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent);
    } else {
      setStudentData(null);
    }
  }, [selectedStudent]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {!studentData && (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Select
              value={selectedClassroom}
              onValueChange={setSelectedClassroom}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={t("progress.selectClassroom")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("progress.allClassrooms")}
                </SelectItem>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    {classroom.name} ({classroom.classCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder={t("progress.searchStudentsPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-[200px]"
            />
          </div>
        )}

        {selectedStudent && (
          <Button variant="outline" onClick={() => setSelectedStudent(null)}>
            {t("progress.backToOverview")}
          </Button>
        )}
      </div>

      {selectedStudent ? (
        // Individual Student View
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold">
              {students.find((s) => s.id === selectedStudent)?.display_name}
            </h2>
            <Badge variant="secondary">
              {students.find((s) => s.id === selectedStudent)?.cefrLevel ||
                "A0"}
            </Badge>
          </div>

          {studentData && (
            <>
              <UserRecentActivity data={studentData.activity || []} />
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-3">
                <div className="col-span-2 flex flex-col gap-4">
                  <UserActivityChart
                    data={studentData.activity || []}
                    xpLogs={studentData.xpLogs || []}
                  />
                  <UserXpOverAllChart data={studentData.xpLogs || []} />
                  <ReadingStatsChart data={studentData.activity || []} />
                </div>
                <div className="flex flex-col gap-4">
                  <CEFRLevels
                    currentLevel={
                      students.find((s) => s.id === selectedStudent)
                        ?.cefrLevel || "A0"
                    }
                  />
                  <UserActivityHeatMap data={studentData.activity || []} />
                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="text-lg">{t("progress.loadingStudentData")}</div>
            </div>
          )}
        </div>
      ) : (
        // Classroom Overview
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("progress.totalStudents")}
                </CardTitle>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classroomStats.totalStudents}
                </div>
                <p className="text-muted-foreground text-xs">
                  {selectedClassroom === "all"
                    ? t("progress.allClassroomsLabel")
                    : t("progress.selectedClassroomLabel")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("progress.averageXp")}
                </CardTitle>
                <TrendingUp className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{classroomStats.avgXp}</div>
                <p className="text-muted-foreground text-xs">
                  {t("progress.averageXpDescription")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("progress.mostCommonLevel")}
                </CardTitle>
                <BookOpen className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classroomStats.mostCommonLevel}
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("progress.mostCommonLevelDescription")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("progress.activeThisWeek")}
                </CardTitle>
                <Clock className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {classroomStats.activeRate}%
                </div>
                <p className="text-muted-foreground text-xs">
                  {t("progress.activeThisWeekDescription", {
                    count: classroomStats.recentlyActive,
                    total: classroomStats.totalStudents,
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("progress.studentList")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="hover:bg-muted flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
                      onClick={() => setSelectedStudent(student.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">
                            {student.display_name}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {student.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {student.cefrLevel || "A0"}
                        </Badge>
                        <div className="text-muted-foreground text-sm">
                          {t("progress.xpLabel", { xp: student.xp || 0 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
        // <Tabs defaultValue="overview" className="space-y-4">
        //   <TabsList>
        //     <TabsTrigger value="overview">Overview</TabsTrigger>
        //     <TabsTrigger value="students">Students</TabsTrigger>
        //     {/* <TabsTrigger value="performance">Performance</TabsTrigger> */}
        //   </TabsList>

        //   <TabsContent value="overview" className="space-y-4">
        //     {/* Statistics Cards */}

        //     {/* Level Distribution */}
        //     <Card>
        //       <CardHeader>
        //         <CardTitle>CEFR Level Distribution</CardTitle>
        //       </CardHeader>
        //       <CardContent>
        //         <div className="flex flex-wrap gap-2">
        //           {Object.entries(classroomStats.levelCounts).map(
        //             ([level, count]) => (
        //               <Badge
        //                 key={level}
        //                 variant="outline"
        //                 className="px-3 py-1"
        //               >
        //                 {level}: {count} students
        //               </Badge>
        //             ),
        //           )}
        //         </div>
        //       </CardContent>
        //     </Card>
        //   </TabsContent>

        //   <TabsContent value="students" className="space-y-4">
        //     <Card>
        //       <CardHeader>
        //         <CardTitle>Student List</CardTitle>
        //       </CardHeader>
        //       <CardContent>
        //         <div className="space-y-2">
        //           {filteredStudents.map((student) => (
        //             <div
        //               key={student.id}
        //               className="hover:bg-muted flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
        //               onClick={() => setSelectedStudent(student.id)}
        //             >
        //               <div className="flex items-center gap-3">
        //                 <div>
        //                   <div className="font-medium">
        //                     {student.display_name}
        //                   </div>
        //                   <div className="text-muted-foreground text-sm">
        //                     {student.email}
        //                   </div>
        //                 </div>
        //               </div>
        //               <div className="flex items-center gap-2">
        //                 <Badge variant="secondary">
        //                   {student.cefrLevel || "A0"}
        //                 </Badge>
        //                 <div className="text-muted-foreground text-sm">
        //                   {student.xp || 0} XP
        //                 </div>
        //               </div>
        //             </div>
        //           ))}
        //         </div>
        //       </CardContent>
        //     </Card>
        //   </TabsContent>

        //   {/* <TabsContent value="performance" className="space-y-4">
        //     <Card>
        //       <CardHeader>
        //         <CardTitle>Performance Analytics</CardTitle>
        //       </CardHeader>
        //       <CardContent>
        //         <div className="text-muted-foreground py-8 text-center">
        //           Select a student to view detailed performance analytics
        //         </div>
        //       </CardContent>
        //     </Card>
        //   </TabsContent> */}
        // </Tabs>
      )}
    </div>
  );
}
