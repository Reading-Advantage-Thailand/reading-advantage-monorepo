"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";

export function AdminOverviewCharts() {
  const t = useTranslations("AdminDashboard");

  // Mock data for charts - in a real app, this would come from an API
  const chartData = {
    userGrowth: [
      { month: "Jan", students: 45, teachers: 5 },
      { month: "Feb", students: 52, teachers: 6 },
      { month: "Mar", students: 67, teachers: 8 },
      { month: "Apr", students: 89, teachers: 10 },
      { month: "May", students: 124, teachers: 12 },
      { month: "Jun", students: 156, teachers: 15 },
    ],
    topArticles: [
      { title: "The Magic Forest", reads: 234, difficulty: "A1" },
      { title: "Space Adventure", reads: 189, difficulty: "A2" },
      { title: "Ocean Mysteries", reads: 156, difficulty: "B1" },
      { title: "City Life", reads: 143, difficulty: "A1+" },
      { title: "Animal Friends", reads: 127, difficulty: "A1" },
    ],
    activityByLevel: [
      { level: "A1", count: 145, color: "bg-green-500" },
      { level: "A1+", count: 89, color: "bg-blue-500" },
      { level: "A2", count: 67, color: "bg-purple-500" },
      { level: "A2+", count: 34, color: "bg-orange-500" },
      { level: "B1", count: 23, color: "bg-red-500" },
    ],
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("charts.userGrowth")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chartData.userGrowth.map((data, index) => (
              <div key={data.month} className="flex items-center gap-4">
                <div className="w-12 text-sm font-medium">{data.month}</div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ width: `${(data.students / 200) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-gray-600">
                      {data.students}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full bg-green-600"
                        style={{ width: `${(data.teachers / 20) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-gray-600">
                      {data.teachers}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-4 pt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-blue-600"></div>
                <span>Students</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-green-600"></div>
                <span>Teachers</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("charts.topArticles")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.topArticles.map((article, index) => (
              <div
                key={article.title}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{article.title}</div>
                    <div className="text-xs text-gray-500">
                      Level: {article.difficulty}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium">{article.reads} reads</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity by Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("charts.activityByLevel")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chartData.activityByLevel.map((level) => (
              <div key={level.level} className="flex items-center gap-3">
                <div className="w-12 text-sm font-medium">{level.level}</div>
                <div className="h-3 flex-1 rounded-full bg-gray-200">
                  <div
                    className={`${level.color} h-3 rounded-full`}
                    style={{ width: `${(level.count / 150) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-sm text-gray-600">{level.count}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("charts.performance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <div className="text-2xl font-bold text-green-600">94%</div>
              <div className="text-sm text-gray-600">Completion Rate</div>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">4.2</div>
              <div className="text-sm text-gray-600">Avg. Score</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">18m</div>
              <div className="text-sm text-gray-600">Avg. Session</div>
            </div>
            <div className="rounded-lg bg-orange-50 p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">85%</div>
              <div className="text-sm text-gray-600">Engagement</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
