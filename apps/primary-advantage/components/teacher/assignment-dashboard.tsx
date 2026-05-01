"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle,
  Circle,
  PlayCircle,
  User,
  BookOpen,
  Award,
  Edit3,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface Student {
  id: string;
  studentId: string;
  status: number;
  displayName: string;
}

interface ProgressStats {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface StatusInfo {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
  dotColor: string;
}

type Assignment = {
  meta: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    classroomId: string;
    articleId: string;
    userId: string;
    createdAt: string;
    articleTitle: string;
  };
  students: {
    id: string;
    displayName: string;
    studentId: string;
    status: number;
  }[];
};

interface Article {
  summary: string;
  image_description: string;
  passage: string;
  created_at: string;
  average_rating: number;
  type: string;
  title: string;
  cefr_level: string;
  thread_id: string;
  ra_level: number;
  subgenre: string;
  genre: string;
  id: string;
  read_count: number;
}

const SkeletonCard = () => (
  <div className="bg-card text-card-foreground border-border animate-pulse rounded-xl border p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <div className="bg-muted mb-2 h-4 w-20 rounded"></div>
        <div className="bg-muted h-8 w-12 rounded"></div>
      </div>
      <div className="bg-muted h-12 w-12 rounded-lg"></div>
    </div>
  </div>
);

const SkeletonHeader = () => (
  <div className="mb-8 animate-pulse">
    <div className="mb-6 flex flex-col items-center justify-between sm:flex-row sm:items-start">
      <div className="mb-4 flex items-center space-x-3">
        <div className="bg-muted h-12 w-12 rounded-xl"></div>
        <div>
          <div className="bg-muted mb-2 h-8 w-64 rounded"></div>
          <div className="bg-muted h-4 w-48 rounded"></div>
        </div>
      </div>
      <div className="bg-muted h-10 w-32 rounded"></div>
    </div>
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-2">
        <div className="bg-muted h-4 w-4 rounded"></div>
        <div className="bg-muted h-4 w-40 rounded"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="bg-muted h-4 w-4 rounded"></div>
        <div className="bg-muted h-4 w-40 rounded"></div>
      </div>
      <div className="bg-muted h-6 w-20 rounded"></div>
    </div>
  </div>
);

const SkeletonProgressSection = () => (
  <div className="bg-card text-card-foreground border-border animate-pulse rounded-xl border p-6 shadow-sm">
    <div className="mb-4 flex items-center justify-between">
      <div className="bg-muted h-6 w-48 rounded"></div>
      <div className="bg-muted h-8 w-16 rounded"></div>
    </div>
    <div className="bg-muted mb-4 h-4 w-full rounded-full"></div>
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-muted/20 rounded-lg p-4 text-center">
          <div className="bg-muted mx-auto mb-1 h-8 w-8 rounded"></div>
          <div className="bg-muted mx-auto mb-1 h-4 w-16 rounded"></div>
          <div className="bg-muted mx-auto h-3 w-8 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonStudentCard = () => (
  <div className="bg-card animate-pulse rounded-xl border p-4">
    <div className="mb-3 flex items-center space-x-3">
      <div className="bg-muted h-10 w-10 rounded-full"></div>
      <div className="flex-1">
        <div className="bg-muted mb-1 h-4 w-32 rounded"></div>
        <div className="bg-muted h-3 w-20 rounded"></div>
      </div>
    </div>
    <div className="bg-muted h-8 rounded"></div>
  </div>
);

const SkeletonStudentsList = () => (
  <div className="bg-card text-card-foreground border-border animate-pulse rounded-xl border p-6 shadow-sm">
    <div className="mb-6 flex flex-col items-center justify-between sm:flex-row">
      <div className="bg-muted h-6 w-32 rounded"></div>
      <div className="mt-2 flex space-x-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-muted h-8 w-20 rounded"></div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <SkeletonStudentCard key={i} />
      ))}
    </div>
  </div>
);

export default function AssignmentDashboard() {
  const t = useTranslations("Teacher.AssignmentDashboard");
  const locale = useLocale();
  const [assignment, setAssignment] = useState<Assignment>({
    meta: {
      id: "",
      title: "",
      description: "",
      dueDate: "",
      classroomId: "",
      articleId: "",
      userId: "",
      createdAt: "",
      articleTitle: "",
    },
    students: [],
  });
  const [article, setArticle] = useState<Article>({
    id: "",
    title: "",
    summary: "",
    image_description: "",
    passage: "",
    created_at: "",
    average_rating: 0,
    type: "",
    cefr_level: "",
    thread_id: "",
    ra_level: 0,
    subgenre: "",
    genre: "",
    read_count: 0,
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const params = useParams();

  const fetchAssignment = async () => {
    try {
      const assignmentId = params.id as string;

      const response = await fetch(`/api/assignments?id=${assignmentId}`);
      const data = await response.json();

      setAssignment(data);
    } catch (error) {
      console.error("Error fetching assignment:", error);
    }
  };

  //   const fetchArticle = async () => {
  //     try {
  //       const articleId = params.articleId as string;

  //       if (!articleId) {
  //         console.error("Missing article ID");
  //         return;
  //       }

  //       const response = await fetch(`/api/v1/articles/${articleId}`);
  //       const data = await response.json();
  //       setArticle(data.article);
  //     } catch (error) {
  //       console.error("Error fetching article:", error);
  //     }
  //   };

  const handleAssignmentUpdate = async () => {
    setIsLoading(true);
    await Promise.all([fetchAssignment()]);
    setIsLoading(false);
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
    setSelectedStudents([]);
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const handleDeleteStudents = async () => {
    if (selectedStudents.length === 0) return;

    setIsDeleting(true);
    try {
      // Convert assignment IDs to student IDs
      const selectedStudentIds = selectedStudents
        .map((assignmentId) => {
          const student = assignment.students.find(
            (s) => s.id === assignmentId,
          );
          return student?.studentId;
        })
        .filter(Boolean) as string[];

      if (selectedStudentIds.length === 0) {
        console.error("No valid student IDs found");
        setIsDeleting(false);
        return;
      }

      const response = await fetch("/api/v1/assignments", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomId: assignment.meta.classroomId,
          articleId: assignment.meta.articleId,
          studentIds: selectedStudentIds,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        await handleAssignmentUpdate();
        setSelectedStudents([]);
        setIsEditMode(false);
      } else {
        const errorData = await response.json();
        console.error("Failed to delete students:", errorData);
        // You might want to show a user-friendly error message here
      }
    } catch (error) {
      console.error("Error deleting students:", error);
      // You might want to show a user-friendly error message here
    } finally {
      setIsDeleting(false);
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await Promise.all([fetchAssignment()]);
      setIsLoading(false);
    };

    fetchData();
  }, [params]);

  const getStatusInfo = (status: number): StatusInfo => {
    switch (status) {
      case 0:
        return {
          label: t("notStarted"),
          color: "bg-muted text-muted-foreground border-border",
          bgColor: "bg-muted/50",
          icon: Circle,
          dotColor: "bg-muted-foreground",
        };
      case 1:
        return {
          label: t("inProgress"),
          color: "bg-primary/10 text-primary border-primary/20",
          bgColor: "bg-primary/5",
          icon: PlayCircle,
          dotColor: "bg-primary",
        };
      case 2:
        return {
          label: t("completed"),
          color: "bg-green-600/10 text-green-600 border-secondary/20",
          bgColor: "bg-secondary/5",
          icon: CheckCircle,
          dotColor: "bg-secondary",
        };
      default:
        return {
          label: t("unknownStatus"),
          color: "bg-muted text-muted-foreground border-border",
          bgColor: "bg-muted/50",
          icon: Circle,
          dotColor: "bg-muted-foreground",
        };
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDaysRemaining = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressStats = (students: Student[]): ProgressStats => {
    const total = students.length;
    const notStarted = students.filter((s) => s.status === 0).length;
    const inProgress = students.filter((s) => s.status === 1).length;
    const completed = students.filter((s) => s.status === 2).length;
    const overdue = students.filter(
      (s) => s.status !== 2 && getDaysRemaining(assignment.meta.dueDate) < 0,
    ).length;

    return {
      total,
      notStarted,
      inProgress,
      completed,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  const getFilteredStudents = () => {
    if (filterStatus === "all") return assignment.students;
    if (filterStatus === "overdue") {
      return assignment.students.filter(
        (student) =>
          student.status !== 2 && getDaysRemaining(assignment.meta.dueDate) < 0,
      );
    }
    return assignment.students.filter(
      (student) => student.status === parseInt(filterStatus),
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto max-w-6xl space-y-6">
          <SkeletonHeader />

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>

          <SkeletonProgressSection />
          <SkeletonStudentsList />
        </div>
      </div>
    );
  }

  const stats = getProgressStats(assignment.students);
  const daysRemaining = getDaysRemaining(assignment.meta.dueDate);
  const filteredStudents = getFilteredStudents();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header section */}
        <div className="mb-8">
          <div className="mb-6 flex flex-col items-center justify-between sm:flex-row sm:items-start">
            <div className="mb-4 flex items-center space-x-3">
              <div className="bg-primary flex h-24 w-24 items-center justify-center rounded-xl">
                <BookOpen className="text-primary-foreground h-12 w-12" />
              </div>
              <div>
                <h1 className="text-foreground text-3xl font-bold">
                  {assignment.meta.articleTitle}
                </h1>
                <h2 className="text-foreground text-3xl font-bold">
                  {assignment.meta.title}
                </h2>
                <p className="text-muted-foreground">
                  {assignment.meta.description}
                </p>
              </div>
            </div>
            <div>
              {/* <AssignDialog
                article={article}
                articleId={article.id}
                userId={assignment.meta.userId}
                pageType="assignment"
                classroomId={assignment.meta.classroomId}
                onUpdate={handleAssignmentUpdate}
              /> */}
            </div>
          </div>

          <div className="text-muted-foreground flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>
                {t("createdOn")}: {formatDate(assignment.meta.createdAt)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>
                {t("dueDate")}: {formatDate(assignment.meta.dueDate)}
              </span>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                daysRemaining < 0
                  ? "bg-destructive/10 text-destructive"
                  : daysRemaining <= 3
                    ? "bg-orange-600/10 text-orange-600"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {daysRemaining < 0
                ? t("overdue")
                : daysRemaining === 0
                  ? t("dueToday")
                  : t("daysRemaining", { daysRemaining })}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-5">
          {/* Total Students Card */}
          <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("allStudents")}
                </p>
                <p className="text-primary text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <Users className="text-primary h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Not Started Card */}
          <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("notStarted")}
                </p>
                <p className="text-primary text-2xl font-bold">
                  {stats.notStarted}
                </p>
              </div>
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <Circle className="text-primary h-6 w-6" />
              </div>
            </div>
          </div>

          {/* In Progress Card */}
          <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("inProgress")}
                </p>
                <p className="text-primary text-2xl font-bold">
                  {stats.inProgress}
                </p>
              </div>
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <PlayCircle className="text-primary h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Completed Card */}
          <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("completed")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-600/10">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Overdue Card */}
          <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border p-6 shadow-sm transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  {t("overdue")}
                </p>
                <p className="text-destructive text-2xl font-bold">
                  {stats.overdue}
                </p>
              </div>
              <div className="bg-destructive/5 flex h-12 w-12 items-center justify-center rounded-lg">
                <Clock className="text-destructive h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-card text-card-foreground border-border hover:border-primary/50 rounded-xl border p-6 shadow-sm transition-colors">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-foreground flex items-center space-x-2 text-xl font-semibold">
              <Award className="text-primary h-5 w-5" />
              <span>{t("overallProgress")}</span>
            </h2>
            <span className="text-primary text-2xl font-bold">
              {stats.completionRate}%
            </span>
          </div>

          <div className="bg-muted mb-4 h-4 w-full rounded-full">
            <div
              className="from-primary to-secondary relative h-4 rounded-full bg-gradient-to-r transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            >
              <div className="bg-secondary absolute top-0 right-0 h-4 w-2 rounded-r-full"></div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <div className="text-primary mb-1 text-2xl font-bold">
                {stats.notStarted}
              </div>
              <div className="text-primary/80 text-sm">{t("notStarted")}</div>
              <div className="text-primary/60 mt-1 text-xs">
                {stats.total > 0
                  ? Math.round((stats.notStarted / stats.total) * 100)
                  : 0}
                %
              </div>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <div className="text-primary mb-1 text-2xl font-bold">
                {stats.inProgress}
              </div>
              <div className="text-primary/80 text-sm">{t("inProgress")}</div>
              <div className="text-primary/60 mt-1 text-xs">
                {stats.total > 0
                  ? Math.round((stats.inProgress / stats.total) * 100)
                  : 0}
                %
              </div>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 text-center">
              <div className="text-primary mb-1 text-2xl font-bold">
                {stats.completed}
              </div>
              <div className="text-primary/80 text-sm">{t("completed")}</div>
              <div className="text-primary/60 mt-1 text-xs">
                {stats.completionRate}%
              </div>
            </div>
            <div className="bg-destructive/5 rounded-lg p-4 text-center">
              <div className="text-destructive mb-1 text-2xl font-bold">
                {stats.overdue}
              </div>
              <div className="text-destructive/80 text-sm">{t("overdue")}</div>
              <div className="text-destructive/60 mt-1 text-xs">
                {stats.total > 0
                  ? Math.round((stats.overdue / stats.total) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-card text-card-foreground border-border rounded-xl border p-6 shadow-sm">
          <div className="mb-6 flex flex-col items-center justify-between sm:flex-row">
            <h2 className="text-foreground text-xl font-semibold">
              {t("studentList")}
            </h2>
            <div className="mt-2 flex items-center space-x-2">
              {/* Filter Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === "all"
                      ? "bg-primary/10 text-primary border-primary/20 border"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t("all")} ({stats.total})
                </button>
                <button
                  onClick={() => setFilterStatus("0")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === "0"
                      ? "bg-muted/50 text-muted-foreground border-border border"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("notStarted")} ({stats.notStarted})
                </button>
                <button
                  onClick={() => setFilterStatus("1")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === "1"
                      ? "bg-primary/10 text-primary border-primary/20 border"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("inProgress")} ({stats.inProgress})
                </button>
                <button
                  onClick={() => setFilterStatus("2")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === "2"
                      ? "bg-secondary/10 text-secondary border-secondary/20 border"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("completed")} ({stats.completed})
                </button>
                <button
                  onClick={() => setFilterStatus("overdue")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    filterStatus === "overdue"
                      ? "bg-destructive/10 text-destructive border-destructive/20 border"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("overdue")} ({stats.overdue})
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4 flex justify-end space-x-2">
            {/* Edit Mode Controls */}
            {isEditMode && (
              <>
                <button
                  onClick={handleDeleteStudents}
                  disabled={selectedStudents.length === 0 || isDeleting}
                  className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedStudents.length === 0 || isDeleting
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  }`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>
                    {isDeleting
                      ? t("deleting")
                      : t("deleteCount", { count: selectedStudents.length })}
                  </span>
                </button>
                <button
                  onClick={handleEditToggle}
                  className="bg-muted text-muted-foreground hover:bg-muted/80 flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>{t("cancel")}</span>
                </button>
              </>
            )}

            {/* Edit Button */}
            {!isEditMode && (
              <button
                onClick={handleEditToggle}
                className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                <span>{t("edit")}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudents.map((student) => {
              const statusInfo = getStatusInfo(student.status);
              const StatusIcon = statusInfo.icon;
              const isOverdue =
                student.status !== 2 &&
                getDaysRemaining(assignment.meta.dueDate) < 0;
              const isSelected = selectedStudents.includes(student.id);

              return (
                <div
                  key={student.id}
                  className={`relative rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
                    isOverdue
                      ? "bg-destructive/5 border-destructive/20"
                      : `${statusInfo.bgColor} border-border`
                  } ${isSelected ? "ring-primary ring-2 ring-offset-2" : ""}`}
                >
                  {/* Checkbox for edit mode */}
                  {isEditMode && (
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => handleStudentSelect(student.id)}
                        className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground hover:border-primary"
                        }`}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                      </button>
                    </div>
                  )}

                  <div className="mb-3 flex items-center space-x-3">
                    <div className="from-primary to-primary/60 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br">
                      <User className="text-primary-foreground h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-foreground font-medium">
                        {student.displayName}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        ID: {student.studentId.slice(-8)}
                        {"..."}
                      </p>
                    </div>
                    {isOverdue && (
                      <div className="bg-destructive/10 text-destructive rounded-full px-2 py-1 text-xs font-medium">
                        {t("overdue")}
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-center space-x-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                      isOverdue
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : statusInfo.color
                    }`}
                  >
                    <StatusIcon className="h-4 w-4" />
                    <span>{statusInfo.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="py-12 text-center">
              <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Users className="text-muted-foreground h-8 w-8" />
              </div>
              <p className="text-muted-foreground">
                {t("noStudentsInSelectedStatus")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
