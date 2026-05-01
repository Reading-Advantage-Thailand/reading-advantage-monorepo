"use client";
import React from "react";
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
import { UserActivityLog } from "@/types";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ChevronsUpDownIcon, CheckCircleIcon, ClockIcon } from "lucide-react";

interface UserActiviryChartProps {
  data: UserActivityLog[];
}

export default function UserRecentActivity({ data }: UserActiviryChartProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations("Reports");
  const td: string | any = useTranslations("Reports.activityType");

  // Get the most recent activity
  const mostRecentActivity = data[0];
  // Get the remaining activities
  const remainingActivities = data.slice(1);

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex items-center justify-between space-x-4 pr-6">
          <CardTitle className="text-muted-foreground">
            {t("recentactivity")}
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronsUpDownIcon className="h-6 w-6" />
              <span className="sr-only">Expaned</span>
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CardContent className="space-y-2">
          <ScrollArea className={isOpen ? "h-72" : ""}>
            {mostRecentActivity && (
              <div className="flex items-center justify-between px-4 py-2 font-mono text-sm">
                <div>
                  <div className="font-semibold capitalize">
                    {td(mostRecentActivity.activityType)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(mostRecentActivity.createdAt)}
                    {/* {mostRecentActivity.completed &&
                    mostRecentActivity.xpEarned !== 0
                      ? ` - Completed with ${mostRecentActivity.xpEarned} XP`
                      : ""} */}
                  </div>
                </div>
                {mostRecentActivity.completed ? (
                  <Badge className="bg-green-500 hover:bg-green-500">
                    <CheckCircleIcon className="mr-1 size-3" />
                    {t("completed")}
                  </Badge>
                ) : (
                  <Badge className="bg-orange-400 hover:bg-orange-400">
                    <ClockIcon className="mr-1 size-3" />
                    {t("inProgress")}
                  </Badge>
                )}
              </div>
            )}
            <CollapsibleContent className="space-y-2">
              {remainingActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-2 font-mono text-sm"
                >
                  <div>
                    <div className="font-semibold capitalize">
                      {td(activity.activityType)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(activity.createdAt)}
                      {/* {activity.completed &&
                      activity.xpEarned !== 0
                        ? ` - Completed with ${activity.xpEarned} XP`
                        : ""} */}
                    </div>
                  </div>
                  {activity.completed ? (
                    <Badge className="bg-green-500 hover:bg-green-500">
                      <CheckCircleIcon className="mr-1 size-3" />
                      {t("completed")}
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-400 hover:bg-orange-400">
                      <ClockIcon className="mr-1 size-3" />
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
