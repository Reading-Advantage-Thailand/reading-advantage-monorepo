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
import { Timepoint } from "../models/article-model";
import AssignDialog from "./assign-dialog";
import { useCurrentLocale } from "@/locales/client";
import { useScopedI18n } from "@/locales/client";

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
    title: string;
    description: string;
    dueDate: string;
    classroomId: string;
    articleId: string;
    userId: string;
    createdAt: string;
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
  timepoints: Timepoint[];
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
  <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-4 bg-muted rounded w-20 mb-2"></div>
        <div className="h-8 bg-muted rounded w-12"></div>
      </div>
      <div className="w-12 h-12 bg-muted rounded-lg"></div>
    </div>
  </div>
);

const SkeletonHeader = () => (
  <div className="mb-8 animate-pulse">
    <div className="flex justify-between flex-col sm:flex-row items-center sm:items-start mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-12 h-12 bg-muted rounded-xl"></div>
        <div>
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-48"></div>
        </div>
      </div>
      <div className="h-10 bg-muted rounded w-32"></div>
    </div>
    <div className="flex items-center space-x-6">
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-muted rounded"></div>
        <div className="h-4 bg-muted rounded w-40"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 bg-muted rounded"></div>
        <div className="h-4 bg-muted rounded w-40"></div>
      </div>
      <div className="h-6 bg-muted rounded w-20"></div>
    </div>
  </div>
);

const SkeletonProgressSection = () => (
  <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-muted rounded w-48"></div>
      <div className="h-8 bg-muted rounded w-16"></div>
    </div>
    <div className="w-full bg-muted rounded-full h-4 mb-4"></div>
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="text-center p-4 bg-muted/20 rounded-lg">
          <div className="h-8 bg-muted rounded w-8 mx-auto mb-1"></div>
          <div className="h-4 bg-muted rounded w-16 mx-auto mb-1"></div>
          <div className="h-3 bg-muted rounded w-8 mx-auto"></div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonStudentCard = () => (
  <div className="p-4 rounded-xl border bg-card animate-pulse">
    <div className="flex items-center space-x-3 mb-3">
      <div className="w-10 h-10 bg-muted rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-muted rounded w-32 mb-1"></div>
        <div className="h-3 bg-muted rounded w-20"></div>
      </div>
    </div>
    <div className="h-8 bg-muted rounded"></div>
  </div>
);

const SkeletonStudentsList = () => (
  <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 animate-pulse">
    <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
      <div className="h-6 bg-muted rounded w-32"></div>
      <div className="flex space-x-2 mt-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-muted rounded w-20"></div>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <SkeletonStudentCard key={i} />
      ))}
    </div>
  </div>
);

const AssignmentDashboard = () => {
  const [assignment, setAssignment] = useState<Assignment>({
    meta: {
      title: "",
      description: "",
      dueDate: "",
      classroomId: "",
      articleId: "",
      userId: "",
      createdAt: "",
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
    timepoints: [],
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
  const currentLocale = useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi";
  const t = useScopedI18n("pages.teacher.AssignmentPage");

  const fetchAssignment = async () => {
    try {
      const classroomId = params.classroomId as string;
      const articleId = params.articleId as string;

      if (!classroomId || !articleId) {
        console.error("Missing required parameters");
        return;
      }

      const response = await fetch(
        `/api/v1/assignments?classroomId=${classroomId}&articleId=${articleId}`
      );
      const data = await response.json();
      setAssignment(data);
    } catch (error) {
      console.error("Error fetching assignment:", error);
    }
  };

  const fetchArticle = async () => {
    try {
      const articleId = params.articleId as string;

      if (!articleId) {
        console.error("Missing article ID");
        return;
      }

      const response = await fetch(`/api/v1/articles/${articleId}`);
      const data = await response.json();
      setArticle(data.article);
    } catch (error) {
      console.error("Error fetching article:", error);
    }
  };

  const handleAssignmentUpdate = async () => {
    setIsLoading(true);
    await Promise.all([fetchAssignment(), fetchArticle()]);
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
        : [...prev, studentId]
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
            (s) => s.id === assignmentId
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
      await Promise.all([fetchAssignment(), fetchArticle()]);
      setIsLoading(false);
    };

    fetchData();
  }, [params]);

  const getStatusInfo = (status: number): StatusInfo => {
    switch (status) {
      case 0:
        return {
          label: `${t("notStarted")}`,
          color: "bg-muted text-muted-foreground border-border",
          bgColor: "bg-muted/50",
          icon: Circle,
          dotColor: "bg-muted-foreground",
        };
      case 1:
        return {
          label: `${t("inProgress")}`,
          color: "bg-primary/10 text-primary border-primary/20",
          bgColor: "bg-primary/5",
          icon: PlayCircle,
          dotColor: "bg-primary",
        };
      case 2:
        return {
          label: `${t("completed")}`,
          color: "bg-green-600/10 text-green-600 border-secondary/20",
          bgColor: "bg-secondary/5",
          icon: CheckCircle,
          dotColor: "bg-secondary",
        };
      default:
        return {
          label: `${t("unknownStatus")}`,
          color: "bg-muted text-muted-foreground border-border",
          bgColor: "bg-muted/50",
          icon: Circle,
          dotColor: "bg-muted-foreground",
        };
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(`${currentLocale}`, {
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
      (s) => s.status !== 2 && getDaysRemaining(assignment.meta.dueDate) < 0
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
          student.status !== 2 && getDaysRemaining(assignment.meta.dueDate) < 0
      );
    }
    return assignment.students.filter(
      (student) => student.status === parseInt(filterStatus)
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          <SkeletonHeader />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header section */}
        <div className="mb-8">
          <div className="flex justify-between flex-col sm:flex-row items-center sm:items-start mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-24 h-24 bg-primary rounded-xl flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {article.title}
                </h1>
                <h2 className="text-3xl font-bold text-foreground">
                  {assignment.meta.title}
                </h2>
                <p className="text-muted-foreground">
                  {assignment.meta.description}
                </p>
              </div>
            </div>
            <div>
              <AssignDialog
                article={article}
                articleId={article.id}
                userId={assignment.meta.userId}
                pageType="assignment"
                classroomId={assignment.meta.classroomId}
                onUpdate={handleAssignmentUpdate}
              />
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>
                {t("createdOn")}: {formatDate(assignment.meta.createdAt)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>
                {t("dueDate")}: {formatDate(assignment.meta.dueDate)}
              </span>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                daysRemaining < 0
                  ? "bg-destructive/10 text-destructive"
                  : daysRemaining <= 3
                    ? "bg-orange-600/10 text-orange-600"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              {daysRemaining < 0
                ? `${t("overdue")}`
                : daysRemaining === 0
                  ? `${t("dueToday")}`
                  : `${t("daysRemaining", {
                      daysRemaining: daysRemaining,
                    })}`}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {/* Total Students Card */}
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("allStudents")}
                </p>
                <p className="text-2xl font-bold text-primary">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Not Started Card */}
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("notStarted")}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {stats.notStarted}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Circle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* In Progress Card */}
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("inProgress")}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {stats.inProgress}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>

          {/* Completed Card */}
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("completed")}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-600/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Overdue Card */}
          <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-colors hover:border-primary/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t("overdue")}
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {stats.overdue}
                </p>
              </div>
              <div className="w-12 h-12 bg-destructive/5 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-colors hover:border-primary/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center space-x-2">
              <Award className="w-5 h-5 text-primary" />
              <span>{t("overallProgress")}</span>
            </h2>
            <span className="text-2xl font-bold text-primary">
              {stats.completionRate}%
            </span>
          </div>

          <div className="w-full bg-muted rounded-full h-4 mb-4">
            <div
              className="bg-gradient-to-r from-primary to-secondary h-4 rounded-full transition-all duration-500 relative"
              style={{ width: `${stats.completionRate}%` }}
            >
              <div className="absolute right-0 top-0 w-2 h-4 bg-secondary rounded-r-full"></div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">
                {stats.notStarted}
              </div>
              <div className="text-sm text-primary/80">{t("notStarted")}</div>
              <div className="text-xs text-primary/60 mt-1">
                {stats.total > 0
                  ? Math.round((stats.notStarted / stats.total) * 100)
                  : 0}
                %
              </div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">
                {stats.inProgress}
              </div>
              <div className="text-sm text-primary/80">{t("inProgress")}</div>
              <div className="text-xs text-primary/60 mt-1">
                {stats.total > 0
                  ? Math.round((stats.inProgress / stats.total) * 100)
                  : 0}
                %
              </div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary mb-1">
                {stats.completed}
              </div>
              <div className="text-sm text-primary/80">{t("completed")}</div>
              <div className="text-xs text-primary/60 mt-1">
                {stats.completionRate}%
              </div>
            </div>
            <div className="text-center p-4 bg-destructive/5 rounded-lg">
              <div className="text-2xl font-bold text-destructive mb-1">
                {stats.overdue}
              </div>
              <div className="text-sm text-destructive/80">{t("overdue")}</div>
              <div className="text-xs text-destructive/60 mt-1">
                {stats.total > 0
                  ? Math.round((stats.overdue / stats.total) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              {t("studentList")}
            </h2>
            <div className="flex items-center space-x-2 mt-2">
              {/* Filter Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "all"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t("all")} ({stats.total})
                </button>
                <button
                  onClick={() => setFilterStatus("0")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "0"
                      ? "bg-muted/50 text-muted-foreground border border-border"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("notStarted")} ({stats.notStarted})
                </button>
                <button
                  onClick={() => setFilterStatus("1")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "1"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("inProgress")} ({stats.inProgress})
                </button>
                <button
                  onClick={() => setFilterStatus("2")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "2"
                      ? "bg-secondary/10 text-secondary border border-secondary/20"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("completed")} ({stats.completed})
                </button>
                <button
                  onClick={() => setFilterStatus("overdue")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === "overdue"
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-muted/20 text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {t("overdue")} ({stats.overdue})
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mb-4">
            {/* Edit Mode Controls */}
            {isEditMode && (
              <>
                <button
                  onClick={handleDeleteStudents}
                  disabled={selectedStudents.length === 0 || isDeleting}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                    selectedStudents.length === 0 || isDeleting
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isDeleting
                      ? "Deleting..."
                      : `Delete (${selectedStudents.length})`}
                  </span>
                </button>
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80 flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            )}

            {/* Edit Button */}
            {!isEditMode && (
              <button
                onClick={handleEditToggle}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary/10 text-primary hover:bg-primary/20 flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md relative ${
                    isOverdue
                      ? "bg-destructive/5 border-destructive/20"
                      : `${statusInfo.bgColor} border-border`
                  } ${isSelected ? "ring-2 ring-primary ring-offset-2" : ""}`}
                >
                  {/* Checkbox for edit mode */}
                  {isEditMode && (
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => handleStudentSelect(student.id)}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground hover:border-primary"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {student.displayName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        ID: {student.studentId.slice(-8)}
                        {"..."}
                      </p>
                    </div>
                    {isOverdue && (
                      <div className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded-full">
                        {t("overdue")}
                      </div>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium border ${
                      isOverdue
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : statusInfo.color
                    }`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    <span>{statusInfo.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
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
};

export default AssignmentDashboard;
