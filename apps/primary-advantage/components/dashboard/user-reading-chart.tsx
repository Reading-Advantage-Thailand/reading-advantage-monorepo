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
import { UserActivityLog, UserActiviryChartProps } from "@/types";
import { ActivityType } from "@/types/enum";
import { useTranslations } from "next-intl";
import { BookOpenIcon } from "lucide-react";
import { EmptyState } from "@reading-advantage/ui";

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

const ReadingStatsChart = ({ data }: UserActiviryChartProps) => {
  const { resolvedTheme } = useTheme();
  const [seletedValue, setSeletedValue] = React.useState<string>("type");
  const t = useTranslations("Reports");

  const formatData = (data: UserActivityLog[], selected: string) => {
    const filterArtcileRead = data.filter(
      (item) => item.activityType === ActivityType.ARTICLE_READ,
      // item.activityType === ActivityType.LESSON_READ,
    );

    const articleMap = new Map<string, UserActivityLog>();

    filterArtcileRead.forEach((item) => {
      const articleId =
        (item as any).articleId ||
        (item as any).contentId ||
        (item as any).targetId ||
        undefined;
      if (!articleId) return;

      const existing = articleMap.get(articleId);

      if (
        !existing ||
        (existing.completed !== true && item.completed === true)
      ) {
        articleMap.set(articleId, item);
      }
    });
    const result: Record<string, { inProgress: number; completed: number }> =
      {};

    Array.from(articleMap.values()).forEach((item) => {
      const key = item.details[selected as keyof typeof item.details] as string;
      if (!key) return;

      const status = item.completed ? "completed" : "inProgress";

      if (!result[key]) {
        result[key] = { inProgress: 0, completed: 0 };
      }

      result[key][status]++;
    });

    const formattedData = Object.keys(result)
      .filter((category) => category)
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
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{t("readingstatschart")}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <span id="reading-chart-group" className="text-muted-foreground text-sm">
            {t("groupBy")}
          </span>
          <Select onValueChange={handleSeletedChange} defaultValue="type">
            <SelectTrigger aria-labelledby="reading-chart-group" className="h-12 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="type">{t("groupType")}</SelectItem>
              <SelectItem value="genre">{t("groupGenre")}</SelectItem>
              <SelectItem value="subGenre">{t("groupSubgenre")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {getData.length === 0 ? (
          <EmptyState className="py-6" icon={<BookOpenIcon />} title={t("noReading")} description={t("noReadingHint")} />
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
              tick={false}
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
              fill="var(--chart-1)"
              name={t("inProgress")}
              radius={8}
            />
            <Bar
              dataKey="completedRead"
              fill="var(--chart-2)"
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
