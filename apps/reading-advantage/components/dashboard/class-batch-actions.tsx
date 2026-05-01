"use client";

import React, { useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  BookOpen,
  Bell,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import { AssignmentNotificationDialog } from "./assignment-notification-dialog";
import { useRouter } from "next/navigation";

interface ClassBatchActionsProps {
  classroomId: string;
  selectedStudents?: string[];
}

export function ClassBatchActions({
  classroomId,
  selectedStudents = [],
}: ClassBatchActionsProps) {
  const router = useRouter();
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const t = useScopedI18n("components.classBatchActions") as any;

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/classroom/${classroomId}/students`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const data = result.students || [];

      if (!data || data.length === 0) {
        alert(t("noExportData"));
        return;
      }

      // สร้าง CSV
      const headers = [
        t("csv.name"),
        t("csv.email"),
        t("csv.level"),
        t("csv.cefr"),
        t("csv.xp"),
        t("csv.readingSessions"),
        t("csv.assignmentsCompleted"),
        t("csv.assignmentsPending"),
        t("csv.avgAccuracy"),
        t("csv.lastActive"),
        t("csv.joinedAt"),
      ];

      const csvRows = [headers.join(",")];

      data.forEach((student: any) => {
        const row = [
          `"${student.name || ""}"`,
          `"${student.email || ""}"`,
          student.level || "",
          `"${student.cefrLevel || ""}"`,
          student.xp || 0,
          student.readingSessions || 0,
          student.assignmentsCompleted || 0,
          student.assignmentsPending || 0,
          student.averageAccuracy ? student.averageAccuracy.toFixed(2) : "0",
          student.lastActive
            ? new Date(student.lastActive).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          student.joinedAt
            ? new Date(student.joinedAt).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "",
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `classroom_${classroomId}_students_${new Date().toISOString().split("T")[0]}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert(
        t("exportError", {
          message: error instanceof Error ? error.message : "Unknown error",
        })
      );
    } finally {
      setIsExporting(false);
    }
  };

    const actions = [
    {
      icon: Bell,
      label: t("actions.notify"),
      description: t("actions.notifyDesc"),
      onClick: () => setShowNotificationDialog(true),
      variant: "default" as const,
      gradient: "from-blue-500 to-blue-600",
    },
    {
      icon: BookOpen,
      label: t("actions.assign"),
      description: t("actions.assignDesc"),
      onClick: () => router.push("/teacher/passages"),
      variant: "default" as const,
      gradient: "from-green-500 to-green-600",
    },
    {
      icon: BarChart3,
      label: t("actions.manage"),
      description: t("actions.manageDesc"),
      onClick: () => router.push(`/teacher/class-roster`),
      variant: "default" as const,
      gradient: "from-orange-500 to-orange-600",
    },
    {
      icon: FileSpreadsheet,
      label: t("actions.export"),
      description: t("actions.exportDesc"),
      onClick: handleExportData,
      variant: "default" as const,
      gradient: "from-purple-500 to-purple-600",
      loading: isExporting,
    },
  ];

  return (
    <>
      <Card>
          <CardHeader>
          <CardTitle className="text-2xl font-bold">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className="group relative overflow-hidden rounded-xl border bg-card p-6 text-left transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-start space-y-3">
                    <div
                      className={`rounded-lg bg-gradient-to-br ${action.gradient} p-3 text-white shadow-md transition-transform group-hover:scale-110`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.loading ? t("processing") : action.label}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>

          {selectedStudents.length > 0 && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {t("selectedStudents", { count: selectedStudents.length })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AssignmentNotificationDialog
        open={showNotificationDialog}
        onClose={() => setShowNotificationDialog(false)}
        classroomId={classroomId}
        selectedStudentIds={selectedStudents}
      />
    </>
  );
}
