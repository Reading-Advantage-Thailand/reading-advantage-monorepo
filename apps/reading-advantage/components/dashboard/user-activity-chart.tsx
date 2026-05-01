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
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useScopedI18n } from "@/locales/client";

// Function to calculate the data for the chart
// This function takes in the articles and the number of days to go back
// It returns an array of objects with the day of the week and the total number of articles read on that day
// Example: [{ day: "Sun 1", total: 5 }, { day: "Mon 2", total: 10 }, ...]

function formatDataForDays(
  articles: UserActivityLog[],
  calendarValue: DateRange | undefined
) {
  // ISO date
  let startDate: Date;
  let endDate: Date;

  if (calendarValue) {
    startDate = calendarValue.from ? new Date(calendarValue.from) : new Date();
    endDate = calendarValue.to ? new Date(calendarValue.to) : new Date();
  } else {
    // Handle the case when calendarValue is null
    // You can set default values for startDate and endDate here
    startDate = new Date(); // default start date
    endDate = new Date(); // default end date
  }

  startDate.setHours(0, 0, 0, 0); // Set start of the day
  endDate.setHours(23, 59, 59, 999); // Set end of the day

  const data = [];
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {
    const dayOfWeek = daysOfWeek[i.getDay()];
    const dayOfMonth = i.getDate();

    const filteredArticles = articles ? articles.filter((article: UserActivityLog) => {
      const articleDate = new Date(article.timestamp);
      articleDate.setHours(0, 0, 0, 0);
      return articleDate.toDateString() === i.toDateString();
    }) : [];

    // Calculate total XP earned for that day from completed activities
    let xpEarnedForDay = 0;

    for (let j = 0; j < filteredArticles.length; j++) {
      if (filteredArticles[j].completed) {
        xpEarnedForDay += filteredArticles[j].xpEarned;
      }
    }

    data.push({
      day: `${dayOfWeek} ${dayOfMonth}`,
      xpEarned: xpEarnedForDay,
    });
  }

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
  xp: {
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function UserActivityChart({ data }: UserActiviryChartProps) {
  const { resolvedTheme } = useTheme();

  const t = useScopedI18n("pages.student.reportpage");

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 6)),
    to: addDays(new Date(), 0),
  });

  const formattedData = formatDataForDays(data, date);

  const inProgressCount = data ? data.filter(
    (item: UserActivityLog) => !item.completed
  ).length : 0;

  const completedCount = data ? data.filter(
    (item: UserActivityLog) => item.completed
  ).length : 0;

  return (
    <>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle>{t("activityprogress")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 ">
          <div className="grid gap-4 grid-cols-2 col-span-1">
            <Card>
              <CardContent className="py-2 ">
                <CardTitle>{t("inProgress")}</CardTitle>
                <p className="font-bold text-2xl">{inProgressCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-2 ">
                <CardTitle>{t("completed")}</CardTitle>
                <p className="font-bold text-2xl">{completedCount}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="col-span-1 ">
            <CardContent className="flex flex-col py-2 gap-2">
              <CardTitle>{t("daterange")}</CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="flex w-auto flex-col space-y-2 p-2"
                  align="start"
                >
                  <Select
                    onValueChange={(value) => {
                      if (value === "thismonth") {
                        setDate({
                          from: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            1
                          ),
                          to: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                            0
                          ),
                        });
                      } else if (value === "lastmonth") {
                        setDate({
                          from: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() - 1,
                            1
                          ),
                          to: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            0
                          ),
                        });
                      } else {
                        setDate({
                          from: new Date(
                            new Date().setDate(
                              new Date().getDate() - parseInt(value)
                            )
                          ),
                          to: addDays(new Date(), 0),
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="0">Today</SelectItem>
                      <SelectItem value="1">Yesterday</SelectItem>
                      <SelectItem value="7">Last week</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="thismonth">This month</SelectItem>
                      <SelectItem value="lastmonth">Last month</SelectItem>
                    </SelectContent>
                  </Select>
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle>{t("xpearned")}</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
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
                dataKey="day"
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
                dataKey="xpEarned"
                name="XP"
                type="step"
                stroke="var(--color-xp)"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          {/* <ResponsiveContainer width="100%" height={350}>
            <LineChart data={formattedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: any) => `${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {resolvedTheme === "dark" ? (
                <Line
                  dataKey="xpEarned"
                  type="step"
                  stroke="#fafafa"
                  strokeWidth={3}
                  dot={false}
                />
              ) : (
                <Line
                  dataKey="xpEarned"
                  type="step"
                  stroke="#009688"
                  strokeWidth={3}
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer> */}
        </CardContent>
      </Card>
    </>
  );
}
