"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  Download,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

export interface ClassSummaryData {
  id: string;
  name: string;
  classCode: string;
  studentCount: number;
  activeStudents7d: number;
  averageLevel: number;
  totalXp: number;
  createdAt: string;
  archived: boolean;
  trend?: {
    xp: number;
    velocity: number;
  };
  atRisk?: boolean;
}

export interface ClassSummaryTableProps {
  classes: ClassSummaryData[];
  loading?: boolean;
  onClassClick?: (classId: string) => void;
}

type SortField =
  | "name"
  | "studentCount"
  | "activeStudents7d"
  | "averageLevel"
  | "totalXp";
type SortOrder = "asc" | "desc";

export function ClassSummaryTable({
  classes,
  loading = false,
  onClassClick,
}: ClassSummaryTableProps) {
  const t = useScopedI18n("pages.teacher.dashboardPage.classOverview") as any;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [showArchived, setShowArchived] = useState(false);

  // Filter and sort classes
  const filteredAndSortedClasses = useMemo(() => {
    let result = classes.filter((cls) => {
      // Filter by archived status
      if (!showArchived && cls.archived) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          cls.name.toLowerCase().includes(query) ||
          cls.classCode.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let aValue: number | string = a[sortField];
      let bValue: number | string = b[sortField];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return result;
  }, [classes, searchQuery, sortField, sortOrder, showArchived]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleExportCSV = () => {
    const headers = [
      t("export.headers.className"),
      t("export.headers.classCode"),
      t("export.headers.students"),
      t("export.headers.active7d"),
      t("export.headers.avgLevel"),
      t("export.headers.totalXp"),
      t("export.headers.status"),
    ];

    const rows = filteredAndSortedClasses.map((cls) => [
      cls.name,
      cls.classCode,
      cls.studentCount.toString(),
      cls.activeStudents7d.toString(),
      cls.averageLevel.toFixed(1),
      cls.totalXp.toString(),
      cls.archived ? t("archived") : t("active"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell ?? "");
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      ),
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-classes-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getActivityRate = (activeStudents: number, totalStudents: number) => {
    if (totalStudents === 0) return 0;
    return Math.round((activeStudents / totalStudents) * 100);
  };

  const getTrendIcon = (trend?: { xp: number; velocity: number }) => {
    if (!trend) return <Minus className="h-4 w-4 text-gray-400" />;

    if (trend.xp > 5) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (trend.xp < -5) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const handleRowClick = (classId: string) => {
    if (onClassClick) {
      onClassClick(classId);
    } else {
      router.push(`/teacher/class-detail/${classId}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>
              {t("description")}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              aria-label={
                showArchived ? t("hideArchived") : t("showArchived")
              }
            >
              {showArchived ? t("hideArchived") : t("showArchived")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              aria-label={t("exportCSV")}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("exportCSV")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search */}
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
            aria-label={t("searchClasses")}
            role="searchbox"
          />

          {/* Table */}
          <div
            className="rounded-md border"
            role="region"
            aria-label={t("tableName")}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="w-[40px]"
                    aria-label={t("atRiskIndicator")}
                  ></TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("name")}
                      className="hover:bg-transparent"
                      aria-label={t("sortByClassName")}
                    >
                      {t("className")}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>{t("code")}</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("studentCount")}
                      className="hover:bg-transparent"
                    >
                      {t("students")}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("activeStudents7d")}
                      className="hover:bg-transparent"
                    >
                      {t("active7d")}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("averageLevel")}
                      className="hover:bg-transparent"
                    >
                      {t("avgLevel")}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("totalXp")}
                      className="hover:bg-transparent"
                    >
                      {t("totalXP")}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">{t("trend")}</TableHead>
                  <TableHead className="text-center">{t("status")}</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? t("noClassesMatchingSearch")
                          : t("noClassesFound")}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedClasses.map((cls) => {
                    const activityRate = getActivityRate(
                      cls.activeStudents7d,
                      cls.studentCount
                    );

                    return (
                      <TableRow key={cls.id} className=" hover:bg-muted/50">
                        <TableCell>
                          {cls.atRisk && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {cls.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {cls.classCode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {cls.studentCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{cls.activeStudents7d}</span>
                            <Badge
                              variant={
                                activityRate >= 70
                                  ? "default"
                                  : activityRate >= 40
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {activityRate}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {cls.averageLevel.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          {cls.totalXp.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          {getTrendIcon(cls.trend)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={cls.archived ? "secondary" : "default"}
                          >
                            {cls.archived ? t("archived") : t("active")}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/teacher/class-roster/${cls.id}`)
                                }
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                {t("viewDetails")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/teacher/reports/${cls.id}`)
                                }
                              >
                                {t("viewReports")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/teacher/assignments?class=${cls.id}`
                                  )
                                }
                              >
                                {t("assignments")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          {filteredAndSortedClasses.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                {t("showing")} {filteredAndSortedClasses.length} {t("of")} {classes.length}{" "}
                {classes.length === 1 ? t("class") : t("classes")}
              </p>
              <p>
                {t("totalStudents")}:{" "}
                {filteredAndSortedClasses
                  .reduce((sum, cls) => sum + cls.studentCount, 0)
                  .toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
