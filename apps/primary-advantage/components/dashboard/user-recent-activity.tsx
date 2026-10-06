"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState, StatusChip } from "@reading-advantage/ui";
import { UserActivityLog, UserActiviryChartProps } from "@/types";
import { useFormatDate } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { ActivityIcon, ChevronsUpDownIcon } from "lucide-react";

/**
 * Turns an activity type without a label (for example a new type) into words: "NEW_TYPE" to
 * "New type", so the list never shows a raw message key.
 * @param type The activity type.
 * @returns The readable words.
 */
function humanize(type: string): string {
  const words = type.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The student's recent activity: the newest row, and the other rows behind a "show all" toggle
 * (shown only when there is more than one row). No activity shows an empty state.
 * @param props.data The activity rows, newest first.
 * @returns The recent activity card.
 */
export default function UserRecentActivity({ data }: UserActiviryChartProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations("Reports");
  const td = useTranslations("Reports.activityType");
  const formatDate = useFormatDate();

  const mostRecentActivity = data[0];
  const remainingActivities = data.slice(1);

  /**
   * One activity row: its label, date, and a done or in-progress chip.
   * @param activity The activity.
   * @param key The React key of the row.
   * @returns The row.
   */
  const row = (activity: UserActivityLog, key: React.Key) => (
    <div key={key} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <div>
        <div className="font-semibold">
          {td.has(activity.activityType) ? td(activity.activityType) : humanize(activity.activityType)}
        </div>
        <div className="text-muted-foreground text-xs">{formatDate(activity.createdAt)}</div>
      </div>
      {activity.completed ? (
        <StatusChip tone="success">{t("completed")}</StatusChip>
      ) : (
        <StatusChip tone="warning">{t("inProgress")}</StatusChip>
      )}
    </div>
  );

  return (
    <Card className="mt-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="flex items-center justify-between space-x-4 pr-6">
          <CardTitle className="text-muted-foreground">{t("recentactivity")}</CardTitle>
          {remainingActivities.length > 0 ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="size-12">
                <ChevronsUpDownIcon aria-hidden="true" className="h-6 w-6" />
                <span className="sr-only">{t("showAllActivity")}</span>
              </Button>
            </CollapsibleTrigger>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2">
          {mostRecentActivity ? (
            <ScrollArea className={isOpen ? "h-72" : ""}>
              {row(mostRecentActivity, "latest")}
              <CollapsibleContent className="space-y-2">
                {remainingActivities.map((activity, index) => row(activity, index))}
              </CollapsibleContent>
            </ScrollArea>
          ) : (
            <EmptyState className="py-4" icon={<ActivityIcon />} title={t("noActivity")} description={t("noActivityHint")} />
          )}
        </CardContent>
      </Collapsible>
    </Card>
  );
}
