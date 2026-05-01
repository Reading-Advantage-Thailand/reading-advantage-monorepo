"use client";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface ArticlesByTypeAndGenreChartProps {
  chartData: {
    id: string;
    genre: string;
    fiction?: number;
    nonFiction?: number;
  }[];
}

type GenreChartProps = {
  data: { id: string; genre: string; fiction?: number; nonFiction?: number }[];
  dataKey: "fiction" | "nonFiction";
  config: ChartConfig;
};

const chartConfig = {
  fiction: {
    label: "Fiction",
    color: "hsl(var(--primary))",
  },
  nonFiction: {
    label: "Non Fiction",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const GenreChart = ({ data, dataKey, config }: GenreChartProps) => (
  <ChartContainer config={config} className="aspect-auto h-[800px] w-full">
    <BarChart
      layout="vertical"
      data={data}
      barSize={20}
      margin={{
        left: 5,
        right: 12,
      }}
    >
      <CartesianGrid horizontal={false} />
      <XAxis type="number" />
      <YAxis dataKey="genre" type="category" width={90} />
      <ChartTooltip
        content={
          <ChartTooltipContent className="w-[150px]" nameKey={dataKey} />
        }
      />
      <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`}>
        <LabelList
          dataKey={dataKey}
          position="right"
          offset={12}
          fontSize={12}
          className="fill-foreground"
        />
      </Bar>
    </BarChart>
  </ChartContainer>
);

export default function ArticlesByTypeAndGenreChart({
  chartData,
}: ArticlesByTypeAndGenreChartProps) {
  const [selectedType, setSelectedType] = React.useState<
    "fiction" | "nonFiction" | null
  >("fiction");
  const fictionData = chartData.filter((item) => item.fiction !== undefined);
  const nonFictionData = chartData.filter(
    (item) => item.nonFiction !== undefined
  );

  const total = React.useMemo(
    () => ({
      fiction: fictionData.reduce((acc, curr) => acc + (curr.fiction ?? 0), 0),
      nonFiction: nonFictionData.reduce(
        (acc, curr) => acc + (curr.nonFiction ?? 0),
        0
      ),
    }),
    [chartData]
  );

  return (
    <Card className="h-full w-full max-w-[1200px] mx-auto">
      <CardHeader>
        <CardTitle className="text-lg font-bold sm:text-xl md:text-2xl">
          Articles by Type and Genre
        </CardTitle>
        <div className="flex flex-wrap gap-4">
          {Object.keys(chartConfig).map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <div
                key={chart}
                className={`flex flex-1 min-w-[150px] flex-col justify-center gap-1 sm:border-l sm:border-t-0 sm:px-8 sm:py-6 cursor-pointer ${
                  selectedType === chart
                    ? "p-2 rounded-xl bg-gradient-to-r from-[hsl(var(--primary)/10%)] to-transparent bg-opacity-10"
                    : ""
                }`}
                onClick={() => {
                  if (selectedType !== chart) {
                    setSelectedType(chart);
                  }
                }}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-xl">
                  {total[chart].toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-6 justify-center">
        {(!selectedType || selectedType === "fiction") && (
          <GenreChart
            data={fictionData}
            dataKey="fiction"
            config={chartConfig}
          />
        )}
        {(!selectedType || selectedType === "nonFiction") && (
          <GenreChart
            data={nonFictionData}
            dataKey="nonFiction"
            config={chartConfig}
          />
        )}
      </CardContent>
    </Card>
  );
}
