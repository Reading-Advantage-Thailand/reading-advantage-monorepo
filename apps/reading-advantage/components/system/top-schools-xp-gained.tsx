"use client";
import React from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
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
} from "@/components/ui/chart";

interface TopSchoolByXPGainedChartProps {
  topSchoolByXP: { school: string; xp: number }[];
}

export default function TopSchoolByXPGainedChart({
  topSchoolByXP,
}: TopSchoolByXPGainedChartProps) {
  const chartConfig = {
    xp: {
      label: "XP",
      // color: "hsl(var(--chart-1))",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-bold sm:text-xl md:text-2xl">
            Top Schools by XP Gained
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full mt-14">
          <ChartContainer config={chartConfig}>
            <BarChart
              accessibilityLayer
              data={topSchoolByXP}
              margin={{ top: 20 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="school"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value: string) =>
                  value.length > 5 ? value.slice(0, 5) + "..." : value
                }
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="xp" fill="var(--color-xp)" radius={8}>
                <LabelList
                  dataKey="xp"
                  position="top"
                  className="fill-foreground"
                  offset={12}
                  fontSize={12}
                  formatter={(value: any) =>
                    typeof value === "number" ? value.toLocaleString() : value
                  }
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  );
}
