"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
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
import { useTheme } from "next-themes";
import { UserActivityLog, UserXpLog } from "@/types";
import { useTranslations } from "next-intl";

// Function to calculate the data for the chart
// This function takes in the articles and the number of days to go back
// It returns an array of objects with the day of the week and the total number of articles read on that day
// Example: [{ day: "Sun 1", total: 5 }, { day: "Mon 2", total: 10 }, ...]

function formatDataForDays(articles: UserXpLog[], lastmonth: number) {
  const endDate = new Date();
  const startDate = new Date();
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

  const totalXp: { [key: string]: number } = {};

  // Initialize all months in the range with 0 XP
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const month = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    totalXp[month] = 0;
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Sum up XP for each month from the articles
  articles.forEach((article: UserXpLog) => {
    const articleDate = new Date(article.createdAt);

    // Check if article date is within our range
    if (articleDate >= startDate && articleDate <= endDate) {
      const month = `${monthNames[articleDate.getMonth()]} ${articleDate.getFullYear()}`;
      if (totalXp[month] !== undefined) {
        totalXp[month] += article.xpEarned; // Sum instead of taking max
      }
    }
  });

  // Convert to chart data format
  const data = Object.keys(totalXp)
    .sort((a, b) => {
      // Sort by date to ensure proper chronological order
      const dateA = new Date(a);
      const dateB = new Date(a);
      return dateA.getTime() - dateB.getTime();
    })
    .map((month) => ({
      month: month,
      xpoverall: totalXp[month],
    }));

  return data;
}

// function formatDataForDays(articles: UserXpLog[], lastmonth: number) {
//   // ISO date
//   const startDate = new Date();
//   const endDate = new Date();

//   startDate.setMonth(startDate.getMonth() - lastmonth);

//   const monthNames = [
//     "January",
//     "February",
//     "March",
//     "April",
//     "May",
//     "June",
//     "July",
//     "August",
//     "September",
//     "October",
//     "November",
//     "December",
//   ];

//   const totalXp: { [key: string]: number } = {};

//   // for (
//   //   let i = new Date(startDate);
//   //   i <= endDate;
//   //   i.setMonth(i.getMonth() + 1)
//   // ) {
//   //   const month = `${monthNames[i.getMonth()]} ${i.getFullYear()}`;

//   //   totalXp[month] = 0;
//   // }

//   // for (let i = new Date(startDate); i <= endDate; i.setDate(i.getDate() + 1)) {
//   //   const month = `${monthNames[i.getMonth()]} ${i.getFullYear()}`;

//     //   const filteredArticles = articles.filter((article: UserXpLog) => {
//     //     const articleDate = new Date(article.createdAt);
//     //     articleDate.setHours(0, 0, 0, 0);
//     //     return articleDate.toDateString() === i.toDateString();
//     //   });

//     //   // get the latest level of the user for that day is the status is completed
//     //   // if level is dosent change then the user didnt complete any article that day return the last user updatedLevel

//     //   for (let j = 0; j < filteredArticles.length; j++) {
//     //     if (!totalXp[month] || filteredArticles[j].xpEarned > totalXp[month]) {
//     //       totalXp[month] = filteredArticles[j].xpEarned;
//     //     }
//     //   }
//     // }

//     // // Handle the case where a month has 0 XP
//     // let lastMonthXp = 0;
//     // const data = Object.keys(totalXp).map((month) => {
//     //   if (totalXp[month] === 0) {
//     //     totalXp[month] = lastMonthXp;
//     //   } else {
//     //     lastMonthXp = totalXp[month];
//     //   }
//     //   return {
//     //     month: `${month}`,
//     //     xpoverall: totalXp[month],
//     //   };
//     // });

//     return data;
//   }

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
  data: UserXpLog[];
}

const chartConfig = {
  xpoverall: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function UserXpOverAllChart({ data }: UserActiviryChartProps) {
  const formattedData = formatDataForDays(data, 6);

  const cardDescriptionText = `${formattedData[0]?.month} - ${formattedData[formattedData.length - 1]?.month}`;
  const t = useTranslations("Reports");

  return (
    <>
      <Card className="md:col-span-4">
        <CardHeader>
          <CardTitle>{t("xpoverall")}</CardTitle>
          <CardDescription>{cardDescriptionText}</CardDescription>
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
        </CardContent>
      </Card>
    </>
  );
}
