"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

// Sample data for class activity over the past week
const weeklyActivityData = [
  { day: "Mon", students: 45, teachers: 8, articles: 23, questions: 156 },
  { day: "Tue", students: 52, teachers: 9, articles: 31, questions: 198 },
  { day: "Wed", students: 48, teachers: 7, articles: 27, questions: 174 },
  { day: "Thu", students: 61, teachers: 10, articles: 38, questions: 234 },
  { day: "Fri", students: 58, teachers: 9, articles: 35, questions: 221 },
  { day: "Sat", students: 34, teachers: 5, articles: 18, questions: 98 },
  { day: "Sun", students: 29, teachers: 4, articles: 15, questions: 87 },
];

// Sample data for class engagement metrics
const engagementData = [
  { metric: "Reading", value: 85, color: "#3b82f6" },
  { metric: "Vocabulary", value: 72, color: "#10b981" },
  { metric: "Grammar", value: 68, color: "#f59e0b" },
  { metric: "Listening", value: 79, color: "#8b5cf6" },
  { metric: "Speaking", value: 63, color: "#ef4444" },
];

const chartConfig = {
  students: {
    label: "Active Students",
    color: "#3b82f6",
  },
  teachers: {
    label: "Active Teachers",
    color: "#10b981",
  },
  articles: {
    label: "Articles Read",
    color: "#f59e0b",
  },
  questions: {
    label: "Questions Answered",
    color: "#8b5cf6",
  },
};

export function WeeklyActivityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Activity Overview</CardTitle>
        <CardDescription>
          Daily activity metrics for students and teachers over the past week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={weeklyActivityData}>
            <defs>
              <linearGradient id="studentsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="teachersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis axisLine={false} tickLine={false} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="students"
              stackId="1"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#studentsGradient)"
            />
            <Area
              type="monotone"
              dataKey="teachers"
              stackId="2"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#teachersGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function ClassEngagementChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Engagement Metrics</CardTitle>
        <CardDescription>
          Average engagement scores across different learning activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={engagementData} layout="horizontal">
            <XAxis type="number" domain={[0, 100]} className="text-xs" />
            <YAxis
              dataKey="metric"
              type="category"
              width={80}
              className="text-xs"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              formatter={(value) => [`${value}%`, "Engagement"]}
            />
            <Bar
              dataKey="value"
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              className="transition-all duration-300 hover:opacity-80"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function ActivityMetricsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Activity</CardTitle>
        <CardDescription>
          Articles read and questions answered throughout the week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={weeklyActivityData}>
            <defs>
              <linearGradient id="articlesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient
                id="questionsGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              className="text-xs"
            />
            <YAxis axisLine={false} tickLine={false} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="articles"
              stackId="1"
              stroke="#f59e0b"
              fillOpacity={1}
              fill="url(#articlesGradient)"
            />
            <Area
              type="monotone"
              dataKey="questions"
              stackId="1"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#questionsGradient)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function ActivitySummaryCards() {
  const totalStudents = weeklyActivityData.reduce(
    (sum, day) => sum + day.students,
    0,
  );
  const totalArticles = weeklyActivityData.reduce(
    (sum, day) => sum + day.articles,
    0,
  );
  const totalQuestions = weeklyActivityData.reduce(
    (sum, day) => sum + day.questions,
    0,
  );
  const avgEngagement =
    engagementData.reduce((sum, metric) => sum + metric.value, 0) /
    engagementData.length;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Weekly Active Users
              </p>
              <p className="text-2xl font-bold">{totalStudents}</p>
              <p className="mt-1 flex items-center text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +12% from last week
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Articles Read
              </p>
              <p className="text-2xl font-bold">{totalArticles}</p>
              <p className="mt-1 flex items-center text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +8% from last week
              </p>
            </div>
            <Activity className="h-8 w-8 text-amber-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Questions Answered
              </p>
              <p className="text-2xl font-bold">
                {totalQuestions.toLocaleString()}
              </p>
              <p className="mt-1 flex items-center text-xs text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" />
                +15% from last week
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Avg Engagement
              </p>
              <p className="text-2xl font-bold">{Math.round(avgEngagement)}%</p>
              <p className="mt-1 flex items-center text-xs text-red-600">
                <TrendingDown className="mr-1 h-3 w-3" />
                -3% from last week
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
