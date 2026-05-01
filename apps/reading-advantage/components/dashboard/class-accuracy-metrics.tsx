"use client";

import React, { useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClassAccuracyResponse } from "@/types/dashboard";

interface ClassAccuracyMetricsProps {
  classroomId: string;
  detailed?: boolean;
}

export function ClassAccuracyMetrics({
  classroomId,
  detailed = false,
}: ClassAccuracyMetricsProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClassAccuracyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useScopedI18n("components.classAccuracyMetrics") as any;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/v1/teacher/class/${classroomId}/accuracy?timeframe=90d`
        );

        if (!res.ok) {
          const errorText = await res.text();
          console.error("[ClassAccuracyMetrics] Error response:", errorText);
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }

        const result = await res.json();

        setData(result);
      } catch (err) {
        console.error(
          "[ClassAccuracyMetrics] Failed to fetch accuracy data:",
          err
        );
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }

    if (classroomId) {
      fetchData();
    }
  }, [classroomId]);

    if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription className="text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("errorDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.students || data.students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accuracy by Student & Type</CardTitle>
          <CardDescription>No accuracy data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { students, classAverages } = data;
  const activeStudents = students.filter((s) => s.totalAttempts > 0);

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("descriptionPrefix")} • {activeStudents.length} {t("active")}
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Class averages */}
        <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="text-center">
            <div className="text-lg font-bold">
              {classAverages.mcqAccuracy}%
            </div>
              <div className="text-xs text-muted-foreground">{t("mcqAvg")}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {classAverages.openEndedAccuracy}%
            </div>
              <div className="text-xs text-muted-foreground">{t("openEndedAvg")}</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {classAverages.overallAccuracy}%
            </div>
              <div className="text-xs text-muted-foreground">{t("overallAvg")}</div>
          </div>
        </div>

        {/* Student table */}
        {activeStudents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("headers.student")}</TableHead>
                <TableHead className="text-right">{t("headers.mcq")}</TableHead>
                <TableHead className="text-right">{t("headers.openEnded")}</TableHead>
                <TableHead className="text-right">{t("headers.overall")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStudents.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-medium">
                    {student.studentName}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span>{student.mcqAccuracy}%</span>
                      <span className="text-xs text-muted-foreground">
                        ({student.mcqAttempts})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span>{student.openEndedAccuracy}%</span>
                      <span className="text-xs text-muted-foreground">
                        ({student.openEndedAttempts})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        student.overallAccuracy >= 70
                          ? "text-green-600"
                          : student.overallAccuracy >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {student.overallAccuracy}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {t("noActivity")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
