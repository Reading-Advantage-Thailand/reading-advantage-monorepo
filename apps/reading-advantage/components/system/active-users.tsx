"use client";
import React from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActiveUsersChartProps {
  page: string;
  licenseId?: string;
}

interface charData {
  date: string;
  noOfUsers: number;
}

interface DailyUserData {
  date: string;
  users: {
    id: string;
    name: string;
    email: string;
    image?: string;
  }[];
}

const chartConfig = {
  views: {
    label: "Active Users",
  },
  noOfUsers: {
    label: "noOfUsers",
    color: "hsl(var(--primary))",
    // color: "hsl(221.2 83.2% 53.3%)",
  },
} satisfies ChartConfig;

// Custom tooltip component for Daily mode
const DailyTooltipContent = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const date = data.payload.date;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="font-medium">
        {new Date(date).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <p className="text-sm text-primary font-medium">
        Active Users: {data.value}
      </p>
    </div>
  );
};

export default function ActiveUsersChart({
  page,
  licenseId,
}: ActiveUsersChartProps) {
  const [timeRange, setTimeRange] = React.useState("Daily");
  const [chartType, setChartType] = React.useState<"total" | "license">(
    "total"
  );
  const [selectedLicense, setSelectedLicense] = React.useState<
    string | "total"
  >("total");
  const [chartData, setChartData] = React.useState<charData[]>([]);
  const [dailyUserData, setDailyUserData] = React.useState<DailyUserData[]>([]);
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("noOfUsers");
  const [licenses, setLicenses] = React.useState<string[]>([]);

  const fetchActiveChart = React.useCallback(async () => {
    try {
      let apiUrl = `/api/v1/activity/active-users`;
      const res = await fetch(apiUrl, { method: "GET" });

      if (!res.ok) throw new Error("Failed to fetch User activity");

      const fetchData = await res.json();

      if (!fetchData || typeof fetchData !== "object") {
        throw new Error("Invalid API response format");
      }

      // Fetch daily user data for "Daily" mode
      if (timeRange === "Daily") {
        const dailyRes = await fetch(`/api/v1/activity/daily-active-users`, {
          method: "GET",
        });
        if (dailyRes.ok) {
          const dailyData = await dailyRes.json();

          let dailyDataToUse: DailyUserData[] = [];
          if (page === "admin" && licenseId) {
            dailyDataToUse = dailyData.licenses?.[licenseId] || [];
          } else {
            if (selectedLicense === "total") {
              dailyDataToUse = dailyData.total || [];
            } else {
              dailyDataToUse = dailyData.licenses?.[selectedLicense] || [];
            }
          }

          // Filter to show only today's data
          const today = new Date().toISOString().split("T")[0];
          const todayData = dailyDataToUse.filter(
            (item) => item.date === today
          );

          setDailyUserData(todayData);
        }
      }

      if (page === "system") {
        const fetchLicenseData = await fetch("/api/v1/licenses", {
          method: "GET",
        });

        const LicenseData = await fetchLicenseData.json();

        setLicenses(LicenseData.data);
      }

      let dataToUse: { date: string; noOfUsers: number }[] = [];

      if (page === "admin" && licenseId) {
        dataToUse = fetchData.licenses?.[licenseId] || [];
      } else {
        if (selectedLicense === "total") {
          dataToUse = fetchData.total || [];
        } else {
          dataToUse = fetchData.licenses?.[selectedLicense] || [];
        }
      }

      setChartData(dataToUse);
    } catch (error) {
      console.error(error);
    }
  }, [page, licenseId, selectedLicense, timeRange]);

  React.useEffect(() => {
    fetchActiveChart();
  }, [fetchActiveChart]);

  // Function to fill missing dates with 0 values
  const fillMissingDates = (data: charData[], days: number): charData[] => {
    const now = new Date();
    const filledData: charData[] = [];
    const dataMap = new Map(data.map((item) => [item.date, item.noOfUsers]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateString = date.toISOString().split("T")[0];

      filledData.push({
        date: dateString,
        noOfUsers: dataMap.get(dateString) || 0,
      });
    }

    return filledData;
  };

  const filteredChartData = React.useMemo(() => {
    let daysBack: number;

    switch (timeRange) {
      case "Daily":
        daysBack = 1; // Show only today
        break;
      case "Weekly":
        daysBack = 7;
        break;
      case "Monthly":
        daysBack = 30;
        break;
      default:
        return chartData;
    }

    // Fill missing dates with 0 values for the specified period
    const filledData = fillMissingDates(chartData, daysBack);

    return filledData;
  }, [chartData, timeRange]);

  return (
    <>
      <Card className="col-span-3">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-bold sm:text-xl md:text-2xl">
              Active Users
            </CardTitle>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {timeRange === "Daily"
                  ? dailyUserData.length > 0
                    ? dailyUserData[0]?.users?.length || 0
                    : 0
                  : filteredChartData.reduce(
                      (sum, item) => sum + item.noOfUsers,
                      0
                    )}
              </div>
              <div className="text-sm text-gray-500">
                {timeRange === "Daily" ? "Today" : `Total (${timeRange})`}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {page === "system" && (
            <div className="flex justify-between mb-2">
              <select
                className="p-1 border rounded-md"
                value={selectedLicense}
                onChange={(e) => setSelectedLicense(e.target.value)}
              >
                <option value="total">Total Users</option>
                {licenses.map((license: any, index: number) => (
                  <option key={index} value={license.id}>
                    School Name: {license.schoolName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-between mb-2">
            <select
              className="p-1 border rounded-md"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {timeRange === "Daily" ? (
            // Daily view: Show only user cards using Shadcn components
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Active Users Today</h3>
                <Badge variant="secondary">
                  {dailyUserData.length > 0 &&
                  dailyUserData[0]?.users?.length > 0
                    ? `${dailyUserData[0].users.length} users`
                    : "0 users"}
                </Badge>
              </div>

              {dailyUserData.length > 0 &&
              dailyUserData[0]?.users?.length > 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <ScrollArea className="h-80">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {dailyUserData[0].users.map((user, index) => (
                          <Card
                            key={index}
                            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <Avatar>
                                {user.image && (
                                  <AvatarImage 
                                    src={user.image} 
                                    alt={user.name}
                                  />
                                )}
                                <AvatarFallback>
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className="text-sm font-medium text-center truncate w-full"
                                title={user.name}
                              >
                                {user.name}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <span className="text-2xl">👥</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      No active users today
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Check back later for activity
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            // Weekly/Monthly view: Show vertical bar chart
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[300px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={filteredChartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 40,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tickFormatter={(value: any) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<DailyTooltipContent />} />
                <Bar
                  dataKey={activeChart}
                  fill={`var(--color-${activeChart})`}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </>
  );
}
