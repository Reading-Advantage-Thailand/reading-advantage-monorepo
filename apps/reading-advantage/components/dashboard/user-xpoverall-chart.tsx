"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useState } from "react";
import { useTheme } from "next-themes";
import { UserActivityLog } from "../models/user-activity-log-model";
import { DateValueType } from "react-tailwindcss-datepicker/dist/types";
import { useScopedI18n } from "@/locales/client";

function formatDataForDays(
  articles: UserActivityLog[],
  // calendarValue: DateValueType
  lastmonth: number
) {
  // ISO date
  const startDate = new Date();
  const endDate = new Date();

  startDate.setMonth(startDate.getMonth() - lastmonth);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthlyXpEarned: { [key: string]: number } = {};

  for (
    let i = new Date(startDate);
    i <= endDate;
    i.setMonth(i.getMonth() + 1)
  ) {
    const month = `${monthNames[i.getMonth()]} ${i.getFullYear()}`;
    monthlyXpEarned[month] = 0;
  }

  if (articles) {
    articles.forEach((article: UserActivityLog) => {
      if (article.completed) {
        const articleDate = new Date(article.timestamp);
        const month = `${monthNames[articleDate.getMonth()]} ${articleDate.getFullYear()}`;

        if (monthlyXpEarned.hasOwnProperty(month)) {
          monthlyXpEarned[month] += article.xpEarned || 0;
        }
      }
    });
  }

  let cumulativeXp = 0;
  const data = Object.keys(monthlyXpEarned)
    .sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    })
    .map((month) => {
      cumulativeXp += monthlyXpEarned[month];
      return {
        month: `${month}`,
        xpoverall: cumulativeXp,
      };
    });

  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-accent p-3 rounded-md">
        <p className="text-md font-bold">{`${label}`}</p>
        <p className="text-sm">{`${payload[0].value} XP`}</p>
      </div>
    );
  }

  return null;
};

interface UserActiviryChartProps {
  data: UserActivityLog[];
}

const chartConfig = {
  xpoverall: {
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function UserXpOverAllChart({ data }: UserActiviryChartProps) {
  const { resolvedTheme } = useTheme();
  // const [calendarValue, setCalendarValue] = useState<DateValueType>({
  //   startDate: new Date(new Date().setDate(new Date().getDate() - 6)),
  //   endDate: new Date(),
  // });
  const formattedData = formatDataForDays(data, 5);

  const cardDescriptionText =
    formattedData.length > 0
      ? `${formattedData[0]?.month} - ${formattedData[formattedData.length - 1]?.month}`
      : "No data available";
  const t = useScopedI18n("pages.student.reportpage");

  // const handleValueChange = (newValue: DateValueType) => {
  //   setCalendarValue(newValue);
  // };

  return (
    <>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle>{t("xpoverall")}</CardTitle>
          <CardDescription>{cardDescriptionText}</CardDescription>
        </CardHeader>
        <CardContent className="pl-16">
          <ChartContainer config={chartConfig}>
            <LineChart
              accessibilityLayer
              data={formattedData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={true} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideIndicator />}
              />
              <Line
                dataKey="xpoverall"
                name="XP"
                type="linear"
                stroke="var(--color-xpoverall)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          {/* <ResponsiveContainer width="100%" height={350}>
            <LineChart
              accessibilityLayer
              data={formattedData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <Tooltip content={<CustomTooltip />} />
              {resolvedTheme === "dark" ? (
                <Line dataKey="xpoverall" stroke="#fafafa" strokeWidth={3} />
              ) : (
                <Line dataKey="xpoverall" stroke="#009688" strokeWidth={3} />
              )}
            </LineChart>
          </ResponsiveContainer> */}
        </CardContent>
      </Card>
    </>
  );
}
