"use client";
import React from "react";
import { useTheme } from "next-themes";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserActivityLog } from "../models/user-activity-log-model";
import { useScopedI18n } from "@/locales/client";

const chartConfig = {
  inProgress: {
    label: "inProgress",
    color: "hsl(var(--primary))",
  },
  Completed: {
    label: "Completed",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

interface UserActiviryChartProps {
  data: UserActivityLog[];
}

const ReadingStatsChart = ({ data }: UserActiviryChartProps) => {
  const { resolvedTheme } = useTheme();
  const [seletedValue, setSeletedValue] = React.useState<string>("cefr_level");
  const t = useScopedI18n("pages.student.reportpage");

  const formatData = (value: UserActivityLog[], selected: string) => {
    const filterArtcileRead = value ? value.filter((item) => {
      const activityType = item.activityType?.toLowerCase();
      return (
        activityType === "article_read" ||
        activityType === "lesson_read" ||
        item.activityType === "ARTICLE_READ" ||
        item.activityType === "LESSON_READ"
      );
    }) : [];

    if (filterArtcileRead.length === 0) {
      return [];
    }

    const articleMap = new Map<string, UserActivityLog>();

    filterArtcileRead.forEach((item) => {
      const articleId =
        item.articleId ||
        (item as any).contentId ||
        (item.details as any)?.articleId ||
        (item.details as any)?.contentId ||
        item.contentId ||
        item.targetId;
      if (!articleId) return;

      const existing = articleMap.get(articleId);
      if (!existing || (!existing.completed && item.completed)) {
        articleMap.set(articleId, item);
      }
    });

    if (articleMap.size === 0) {
      return [];
    }

    const result: Record<string, { inProgress: number; completed: number }> =
      {};

    Array.from(articleMap.values()).forEach((item) => {
      let key: string;

      if (selected === "type") {
        key = (item.details as any)?.type || "Unknown Type";
      } else if (selected === "genre") {
        key = (item.details as any)?.genre || "Unknown Genre";
      } else if (selected === "subgenre") {
        key =
          (item.details as any)?.subgenre ||
          (item.details as any)?.subGenre ||
          "Unknown Subgenre";
      } else if (selected === "cefr_level") {
        key = (item.details as any)?.cefr_level || "Unknown CEFR Level";
      } else if (selected === "level") {
        key = `Level ${(item.details as any)?.level || "Unknown"}`;
      } else {
        key = (item.details as any)?.[selected] || `Unknown ${selected}`;
      }

      const status = item.completed ? "completed" : "inProgress";

      if (!result[key]) {
        result[key] = { inProgress: 0, completed: 0 };
      }

      result[key][status]++;
    });

    const formattedData = Object.keys(result)
      .filter((category) => category && category !== "undefined")
      .map((category) => ({
        category,
        inProgressRead: result[category].inProgress,
        completedRead: result[category].completed,
      }));

    return formattedData;
  };

  const getData = formatData(data, seletedValue);

  const handleSeletedChange = (value: string) => {
    setSeletedValue(value);
  };
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between">
        <div>
          <CardTitle>{t("readingstatschart")}</CardTitle>
        </div>
        <Select onValueChange={handleSeletedChange} defaultValue="cefr_level">
          <SelectTrigger className="w-[180px]">
            <CardTitle>Selected</CardTitle>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="type">Type</SelectItem>
            <SelectItem value="genre">Genre</SelectItem>
            <SelectItem value="subgenre">Subgenre</SelectItem>
            <SelectItem value="cefr_level">CEFR Level</SelectItem>
            <SelectItem value="level">Level</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {getData.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No reading data available</p>
              <p className="text-sm">
                Start reading articles to see your reading statistics
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig}>
            <BarChart accessibilityLayer data={getData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="category"
                stroke="#888888"
                tickMargin={10}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => value.slice(0, 10)}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelClassName="capitalize"
                    indicator="dashed"
                  />
                }
              />
              <Bar
                dataKey="inProgressRead"
                fill="var(--color-inProgress)"
                name={t("inProgress")}
                radius={8}
              />
              <Bar
                dataKey="completedRead"
                fill="var(--color-Completed)"
                name={t("completed")}
                radius={8}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default ReadingStatsChart;
