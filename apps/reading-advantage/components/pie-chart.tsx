"use client";

import { Pie, PieChart } from "recharts";

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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

export const description = "A pie chart with a legend";

interface PieChartCustomProps {
  availableLicenses: number;
  usedLicenses: number;
}

export default function PieChartCustom({
  availableLicenses,
  usedLicenses,
}: PieChartCustomProps) {
  const chartData = [
    { name: "used", value: usedLicenses, fill: "var(--color-used)" },
    {
      name: "available",
      value: availableLicenses,
      fill: "var(--color-available)",
    },
  ];

  const chartConfig = {
    value: {
      label: "Visitors",
    },
    used: {
      label: "Used",
      color: "hsl(var(--chart-1))",
    },
    available: {
      label: "Available",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  return (
    <CardContent className="flex-1 pb-0">
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[300px]"
      >
        <PieChart>
          <Pie data={chartData} dataKey="value" />
          <ChartLegend
            content={<ChartLegendContent nameKey="name" />}
            className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
          />
        </PieChart>
      </ChartContainer>
    </CardContent>
  );
}
