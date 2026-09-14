"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";

interface AdminStats {
  totalTeachers: number;
  totalStudents: number;
  totalArticles: number;
  monthlyGrowth: number | null;
}

export function AdminStatsCards() {
  const t = useTranslations("AdminDashboard");
  const [stats, setStats] = useState<AdminStats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalArticles: 0,
    monthlyGrowth: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [teachersRes, studentsRes, articlesRes] = await Promise.all([
          fetch("/api/teachers?count=true"),
          fetch("/api/students?count=true"),
          fetch("/api/articles?count=true"),
        ]);

        if (!teachersRes.ok || !studentsRes.ok || !articlesRes.ok) {
          throw new Error("Failed to fetch admin stats");
        }

        const teachersData = await teachersRes.json();
        const studentsData = await studentsRes.json();
        const articlesData = await articlesRes.json();

        // /api/teachers and /api/students return pagination.total;
        // /api/articles returns totalArticles. Growth has no live source,
        // so it stays null and renders as an em dash.
        setStats({
          totalTeachers: teachersData.pagination?.total ?? 0,
          totalStudents: studentsData.pagination?.total ?? 0,
          totalArticles: articlesData.totalArticles ?? 0,
          monthlyGrowth: null,
        });
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statsData = [
    {
      title: t("stats.teachers"),
      value: stats.totalTeachers,
      icon: GraduationCap,
      description: t("stats.teachersDesc"),
      color: "text-blue-600",
    },
    {
      title: t("stats.students"),
      value: stats.totalStudents,
      icon: Users,
      description: t("stats.studentsDesc"),
      color: "text-green-600",
    },
    {
      title: t("stats.articles"),
      value: stats.totalArticles,
      icon: BookOpen,
      description: t("stats.articlesDesc"),
      color: "text-purple-600",
    },
    {
      title: t("stats.growth"),
      value: stats.monthlyGrowth === null ? "—" : `${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      description: t("stats.growthDesc"),
      color: "text-orange-600",
    },
  ];

  if (loading) {
    return <StatsCardsSkeleton />;
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700"
      >
        {t("stats.loadError")}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 rounded bg-gray-200"></div>
            <div className="h-4 w-4 rounded bg-gray-200"></div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 h-8 w-16 rounded bg-gray-200"></div>
            <div className="h-3 w-32 rounded bg-gray-200"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
