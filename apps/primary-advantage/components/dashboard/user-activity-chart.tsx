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
import { UserActivityLog, UserXpLog } from "@/types";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useTranslations } from "next-intl";

// Function to calculate the data for the chart
// This function takes in the articles and the number of days to go back
// It returns an array of objects with the day of the week and the total number of articles read on that day
// Example: [{ day: "Sun 1", total: 5 }, { day: "Mon 2", total: 10 }, ...]

function formatDataForDays(
  articles: UserXpLog[],
  calendarValue: DateRange | undefined,
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

  let lastedLevel = 0;

  for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {
    const dayOfWeek = daysOfWeek[i.getDay()];
    const dayOfMonth = i.getDate();

    const filteredArticles = articles.filter((article: UserXpLog) => {
      const articleDate = new Date(article.createdAt);
      articleDate.setHours(0, 0, 0, 0);
      return articleDate.toDateString() === i.toDateString();
    });

    // get the latest level of the user for that day is the status is completed
    // if level is dosent change then the user didnt complete any article that day return the last user updatedLevel
    let xpEarned = lastedLevel;

    for (let j = 0; j < filteredArticles.length; j++) {
      xpEarned += filteredArticles[j].xpEarned;
    }

    data.push({
      day: `${dayOfWeek} ${dayOfMonth}`,
      xpEarned,
    });
  }

  return data;
}
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-accent rounded-md p-3">
        <p className="text-md font-bold">{`${label}`}</p>
        <p className="text-sm">{`${payload[0].value} XP`}</p>
      </div>
    );
  }

  return null;
};

interface UserActiviryChartProps {
  data: UserActivityLog[];
  xpLogs: UserXpLog[];
}

const chartConfig = {
  xp: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function UserActivityChart({ data, xpLogs }: UserActiviryChartProps) {
  const t = useTranslations("Reports");
  const tTime = useTranslations("Overall.time");
  const locale = useLocale();

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 6)),
    to: addDays(new Date(), 0),
  });

  const formattedData = formatDataForDays(xpLogs, date);

  const inProgressCount = data.filter(
    (item: UserActivityLog) => !item.completed,
  ).length;

  const completedCount = data.filter(
    (item: UserActivityLog) => item.completed,
  ).length;

  return (
    <>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle className="text-muted-foreground">
            {t("activityprogress")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <div className="col-span-1 grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="">
                <CardTitle className="text-muted-foreground text-sm">
                  {t("inProgress")}
                </CardTitle>
                <p className="text-2xl font-bold">{inProgressCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="">
                <CardTitle className="text-muted-foreground text-sm">
                  {t("completed")}
                </CardTitle>
                <p className="text-2xl font-bold">{completedCount}</p>
              </CardContent>
            </Card>
          </div>
          <Card className="col-span-1">
            <CardContent className="flex flex-col gap-2">
              <CardTitle className="text-muted-foreground text-sm">
                {t("dateRange")}
              </CardTitle>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground",
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
                      <span>{tTime("selectPeriod")}</span>
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
                            1,
                          ),
                          to: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() + 1,
                            0,
                          ),
                        });
                      } else if (value === "lastmonth") {
                        setDate({
                          from: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth() - 1,
                            1,
                          ),
                          to: new Date(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            0,
                          ),
                        });
                      } else {
                        setDate({
                          from: new Date(
                            new Date().setDate(
                              new Date().getDate() - parseInt(value),
                            ),
                          ),
                          to: addDays(new Date(), 0),
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tTime("selectPeriod")} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="0">{tTime("today")}</SelectItem>
                      <SelectItem value="1">{tTime("yesterday")}</SelectItem>
                      <SelectItem value="7">{tTime("lastweek")}</SelectItem>
                      <SelectItem value="30">{tTime("last30days")}</SelectItem>
                      <SelectItem value="thismonth">
                        {tTime("thismonth")}
                      </SelectItem>
                      <SelectItem value="lastmonth">
                        {tTime("lastmonth")}
                      </SelectItem>
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
        </CardContent>
      </Card>
    </>
  );
}
