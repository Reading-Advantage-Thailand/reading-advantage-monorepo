"use client";

import React from "react";
import { useScopedI18n } from "@/locales/client";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

interface AssignmentNotificationBadgeProps {
  assignmentId: string;
  notifiedAssignmentIds: Set<string>;
}

export function AssignmentNotificationBadge({
  assignmentId,
  notifiedAssignmentIds,
}: AssignmentNotificationBadgeProps) {
  const hasNotification = notifiedAssignmentIds.has(assignmentId);
  const t = useScopedI18n("components.assignmentNotification" as any) as any;

  if (!hasNotification) return null;

  return (
    <Badge variant="destructive" className="ml-2 animate-pulse">
      <Bell className="h-3 w-3 mr-1" />
      {t("badge.teacherNotified")}
    </Badge>
  );
}
