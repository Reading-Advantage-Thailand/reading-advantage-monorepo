"use client";
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserActivityLog } from "../models/user-activity-log-model";
import { useScopedI18n } from "@/locales/client";

function formatDataHeatmap(article: UserActivityLog[]) {
  const dateCounts: { [date: string]: number } = {};

  if (article) {
    article.forEach((activity) => {
      const date = new Date(activity.timestamp);
      const dateString = date.toISOString().split("T")[0];

      if (dateCounts[dateString]) {
        dateCounts[dateString]++;
      } else {
        dateCounts[dateString] = 1;
      }
    });
  }

  const result: string[][] = [[], [], []];

  Object.entries(dateCounts).forEach(([date, count]) => {
    if (count > 20) {
      result[0].push(date);
    } else if (count >= 10) {
      result[1].push(date);
    } else if (count >= 1) {
      result[2].push(date);
    }
  });

  const converDatetoSting = result.map((date) =>
    date.map((dateSrting) => new Date(dateSrting))
  );

  return converDatetoSting;
}

interface UserActiviryChartProps {
  data: UserActivityLog[];
}

export default function UserActivityHeatMap({ data }: UserActiviryChartProps) {
  const formattedData = formatDataHeatmap(data);
  const t = useScopedI18n("pages.student.reportpage");
  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>{t("activityheatmap")}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-2">
        <CalendarHeatmap
          variantClassnames={[
            "text-white hover:text-white bg-green-400 hover:bg-green-400",
            "text-white hover:text-white bg-green-500 hover:bg-green-500",
            "text-white hover:text-white bg-green-700 hover:bg-green-700",
          ]}
          datesPerVariant={formattedData}
        />
      </CardContent>
    </Card>
  );
}
