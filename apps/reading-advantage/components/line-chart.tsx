"use client";

import { TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { UserActivityLog } from "./models/user-activity-log-model";
import { number } from "zod";

// Helper function to get the month name
function getMonthName(date: Date): string {
  return date.toLocaleString("default", { month: "long" });
}

function getLastSixMonths(): string[] {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.unshift(getMonthName(date));
  }
  return months;
}

const CEFR_LEVEL_MAP: Record<string, number> = {
  "A0-": 0,
  A0: 1,
  "A0+": 2,
  A1: 3,
  "A1+": 4,
  "A2-": 5,
  A2: 6,
  "A2+": 7,
  "B1-": 8,
  B1: 9,
  "B1+": 10,
  "B2-": 11,
  B2: 12,
  "B2+": 13,
  "C1-": 14,
  C1: 15,
  "C1+": 16,
  "C2-": 17,
  C2: 18,
};

const REVERSE_CEFR_LEVEL_MAP: Record<number, string> = {
  0: "A0-",
  1: "A0",
  2: "A0+",
  3: "A1",
  4: "A1+",
  5: "A2-",
  6: "A2",
  7: "A2+",
  8: "B1-",
  9: "B1",
  10: "B1+",
  11: "B2-",
  12: "B2",
  13: "B2+",
  14: "C1-",
  15: "C1",
  16: "C1+",
  17: "C2-",
  18: "C2",
};

function calculateAverageCEFRLevel(
  articles: UserActivityLog[],
  // calendarValue: DateValueType
  lastmonth: number
) {
  // ISO date
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - lastmonth);

  const recentData = articles.filter(
    (item) => new Date(item.timestamp) >= sixMonthsAgo
  );

  // Check if we have any article read activities with CEFR level
  const articleReadActivities = recentData.filter(
    (activity) =>
      (activity.activityType === "ARTICLE_READ" ||
        activity.activityType === "ARTICLE_RATING") &&
      activity.details?.cefr_level &&
      activity.details.cefr_level in CEFR_LEVEL_MAP
  );

  // Initialize structure with 6 months
  const monthlyCEFR: Record<string, { total: number; count: number }> = {};
  const months = getLastSixMonths();
  months.forEach((month) => {
    monthlyCEFR[month] = { total: 0, count: 0 };
  });

  // If no article read activities, return empty data (null values)
  if (articleReadActivities.length === 0) {
    console.warn("No article read activities found with CEFR levels");
    return months.map((month) => ({
      month,
      average_cefr_level: null,
      number: null,
    }));
  }

  // Aggregate actual data into the structure
  articleReadActivities.forEach((item) => {
    const cefrLevel = item.details?.cefr_level;

    if (!cefrLevel || !(cefrLevel in CEFR_LEVEL_MAP)) {
      console.warn("Skipping invalid CEFR level:", cefrLevel);
      return;
    }

    const month = getMonthName(new Date(item.timestamp));
    if (monthlyCEFR[month]) {
      monthlyCEFR[month].total += CEFR_LEVEL_MAP[cefrLevel];
      monthlyCEFR[month].count += 1;
    }
  });

  // Convert the monthly totals to averages and map to CEFR levels
  const result = months.map((month) => {
    const monthData = monthlyCEFR[month];

    // If no data for this month, return null
    if (monthData.count === 0) {
      return {
        month,
        average_cefr_level: null,
        number: null,
      };
    }

    const averageNumeric = monthData.total / monthData.count;
    const roundedAverage = Math.round(averageNumeric);
    return {
      month,
      average_cefr_level: REVERSE_CEFR_LEVEL_MAP[roundedAverage] || "A0-",
      number: averageNumeric,
    };
  });

  return result;
}

const chartConfig = {
  number: {
    label: "Average CEFR Level",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface UserActiviryChartProps {
  data: UserActivityLog[];
}

// Custom Tooltip Content
const CustomTooltip = ({ active, payload, label, nameKey }: any) => {
  if (active && payload && payload.length) {
    const averageCefrLevel =
      REVERSE_CEFR_LEVEL_MAP[Math.round(payload[0].value)];

    return (
      <div className="custom-tooltip">
        <p className="label">{`${nameKey} : ${averageCefrLevel}`}</p>
      </div>
    );
  }

  return null;
};

export default function LineChartCustom({ data }: UserActiviryChartProps) {
  const formattedData = calculateAverageCEFRLevel(data, 5);

  // Check if we have any actual data
  const hasData = formattedData.some((item) => item.number !== null);

  if (!hasData) {
    return (
      <CardContent>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <div className="text-center">
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm mt-2">
              No article reading activities found in the last 6 months
            </p>
          </div>
        </div>
      </CardContent>
    );
  }

  // Filter out null values for the chart
  const chartData = formattedData.filter((item) => item.number !== null);

  return (
    <CardContent>
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <ChartLegend content={<ChartLegendContent />} />
          <CartesianGrid />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 18]}
            ticks={[0, 3, 6, 9, 12, 15, 18]}
            tickFormatter={(value) => REVERSE_CEFR_LEVEL_MAP[value] || value}
          />
          <Tooltip content={<CustomTooltip nameKey="Average CEFR Level" />} />
          <Line
            dataKey="number"
            stroke="var(--color-number)"
            strokeWidth={2}
            dot={true}
            connectNulls={false}
          />
        </LineChart>
      </ChartContainer>
    </CardContent>
  );
}
