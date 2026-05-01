"use client";
import React from "react";
import {
  CaretSortIcon,
  CheckCircledIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserActivityLog } from "../models/user-activity-log-model";
import { formatDate } from "@/lib/utils";
import { useScopedI18n } from "@/locales/client";
interface UserActiviryChartProps {
  data: UserActivityLog[];
}
export default function UserRecentActivity({ data }: UserActiviryChartProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useScopedI18n("pages.student.reportpage");
  const td: string | any = useScopedI18n(
    "pages.student.reportpage.activitytype"
  );

  // Sort the data by timestamp in descending order
  const sortedData = data ? [...data].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ) : [];
  // Get the most recent activity
  const mostRecentActivity = sortedData[0];
  // Get the remaining activities
  const remainingActivities = sortedData.slice(1);

  // console.log(typeof mostRecentActivity.activityType);

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between pr-6 space-x-4">
          <CardHeader>
            <CardTitle>{t("recentactivity")}</CardTitle>
          </CardHeader>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <CaretSortIcon className="h-6 w-6" />
              <span className="sr-only">Expaned</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CardContent className="space-y-2">
          <ScrollArea className={isOpen ? "h-72" : ""}>
            {mostRecentActivity && (
              <div className="flex items-center justify-between px-4 py-2 font-mono text-sm ">
                <div>
                  <div className="capitalize font-semibold">
                    {td(mostRecentActivity.activityType)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(mostRecentActivity.timestamp)}
                    {mostRecentActivity.completed &&
                    mostRecentActivity.xpEarned !== 0
                      ? ` - Completed with ${mostRecentActivity.xpEarned} XP`
                      : ""}
                  </div>
                </div>
                {mostRecentActivity.completed ? (
                  <Badge className="bg-green-500 hover:bg-green-500">
                    <CheckCircledIcon className="pr-1" />
                    {t("completed")}
                  </Badge>
                ) : (
                  <Badge className="bg-orange-400 hover:bg-orange-400">
                    <ClockIcon className="pr-1" />
                    {t("inProgress")}
                  </Badge>
                )}
              </div>
            )}
            <CollapsibleContent className="space-y-2">
              {remainingActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-2 font-mono text-sm "
                >
                  <div>
                    <div className="capitalize font-semibold">
                      {td(activity.activityType)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(activity.timestamp)}
                      {activity.completed &&
                      activity.xpEarned !== 0
                        ? ` - Completed with ${activity.xpEarned} XP`
                        : ""}
                    </div>
                  </div>
                  {activity.completed ? (
                    <Badge className="bg-green-500 hover:bg-green-500">
                      <CheckCircledIcon className="pr-1" />
                      {t("completed")}
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-400 hover:bg-orange-400">
                      <ClockIcon className="pr-1" />
                      {t("inProgress")}
                    </Badge>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </ScrollArea>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
