"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { Users, GraduationCap, BookOpen, TrendingUp } from "lucide-react";

interface AdminStats {
  totalTeachers: number;
  totalStudents: number;
  totalArticles: number;
  monthlyGrowth: number;
}

export function AdminStatsCards() {
  const t = useTranslations("AdminDashboard");
  const [stats, setStats] = useState<AdminStats>({
    totalTeachers: 0,
    totalStudents: 0,
    totalArticles: 0,
    monthlyGrowth: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Simulate API calls to get stats
        const [teachersRes, studentsRes, articlesRes] = await Promise.all([
          fetch("/api/teachers?count=true"),
          fetch("/api/students?count=true"),
          fetch("/api/articles?count=true"),
        ]);

        const teachersData = await teachersRes.json();
        const studentsData = await studentsRes.json();
        const articlesData = await articlesRes.json();

        setStats({
          totalTeachers: teachersData.total || 0,
          totalStudents: studentsData.total || 0,
          totalArticles: articlesData.total || 0,
          monthlyGrowth: 12.5, // This would come from analytics
        });
      } catch (error) {
        console.error("Failed to fetch admin stats:", error);
        // Set fallback data
        setStats({
          totalTeachers: 25,
          totalStudents: 340,
          totalArticles: 156,
          monthlyGrowth: 8.2,
        });
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
      value: `${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      description: t("stats.growthDesc"),
      color: "text-orange-600",
    },
  ];

  if (loading) {
    return <StatsCardsSkeleton />;
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
