"use client";

import React, { useState, useEffect } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, BookOpen, User, CheckCircle2, Clock } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { th } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface AssignmentNotification {
  id: string;
  assignmentId: string;
  assignment: {
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    type: string;
    level?: string;
    articleId?: string;
  };
  teacher: {
    name: string;
  };
  createdAt: Date;
}

interface AssignmentNotificationPopupProps {
  userId: string;
  onNotificationAcknowledged?: () => void;
}

export function AssignmentNotificationPopup({
  userId,
  onNotificationAcknowledged,
}: AssignmentNotificationPopupProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AssignmentNotification[]>(
    []
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const t = useScopedI18n("components.assignmentNotification" as any) as any;

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(
        `/api/v1/assignment-notifications?studentId=${userId}`
      );
      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        setNotifications(result.data);
        setOpen(true);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleAcknowledge = async (notificationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/assignment-notifications`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId,
          isNoticed: true,
        }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (notifications.length === 1) {
          setOpen(false);
          onNotificationAcknowledged?.();
        }
      }
    } catch (error) {
      console.error("Error acknowledging notification:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAll = async () => {
    setLoading(true);
    try {
      const promises = notifications.map((n) =>
        fetch(`/api/v1/assignment-notifications`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            notificationId: n.id,
            isNoticed: true,
          }),
        })
      );

      await Promise.all(promises);
      setNotifications([]);
      setOpen(false);
      onNotificationAcknowledged?.();
    } catch (error) {
      console.error("Error acknowledging all notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToAssignment = (articleId?: string) => {
    if (!articleId) {
      return;
    }
    router.push(`/student/lesson/${articleId}`);
    setOpen(false);
  };

  if (notifications.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { count: notifications.length })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">
                      {notification.assignment.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{t("fromTeacher", { name: notification.teacher.name })}</span>
                    </div>
                  </div>
                  <Badge variant="destructive">{t("badge.new")}</Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {notification.assignment.description}
                </p>

                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {t("dueLabel")} {format(new Date(notification.assignment.dueDate), "dd MMM yyyy", { locale: th })}
                    </span>
                  </div>
                  {(() => {
                    const dueDate = new Date(notification.assignment.dueDate);
                    const today = new Date();
                    const daysRemaining = differenceInDays(dueDate, today);
                    const isOverdue = isPast(dueDate);

                    if (isOverdue) {
                      return (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {t("due.overdue", { days: Math.abs(daysRemaining) })}
                        </Badge>
                      );
                    } else if (daysRemaining === 0) {
                      return (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {t("due.today")}
                        </Badge>
                      );
                    } else if (daysRemaining === 1) {
                      return (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {t("due.oneDay")}
                        </Badge>
                      );
                    } else if (daysRemaining <= 3) {
                      return (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {t("due.fewDays", { days: daysRemaining })}
                        </Badge>
                      );
                    } else if (daysRemaining <= 7) {
                      return (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {t("due.severalDays", { days: daysRemaining })}
                        </Badge>
                      );
                    } else {
                      return (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {t("due.days", { days: daysRemaining })}
                        </Badge>
                      );
                    }
                  })()}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleGoToAssignment(notification.assignment.articleId)}
                    disabled={!notification.assignment.articleId}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {t("goToAssignment")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledge(notification.id)}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {t("acknowledge")}
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {t("createdAt")}{" "}
                  {format(new Date(notification.createdAt), "dd MMM yyyy HH:mm", { locale: th })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("close")}
          </Button>
          <Button onClick={handleAcknowledgeAll} disabled={loading}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t("acknowledgeAll")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
