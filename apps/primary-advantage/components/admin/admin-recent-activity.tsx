"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import {
  UserPlus,
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  Settings,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type:
    | "user_created"
    | "article_created"
    | "class_created"
    | "teacher_added"
    | "system_update";
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export function AdminRecentActivity() {
  const t = useTranslations("AdminDashboard");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch("/api/admin/recent-activity");
        if (!response.ok) {
          throw new Error("Failed to fetch recent activity");
        }
        const data = await response.json();
        setActivities(data.activities ?? []);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "teacher_added":
        return GraduationCap;
      case "article_created":
        return BookOpen;
      case "class_created":
        return Users;
      case "user_created":
        return UserPlus;
      case "system_update":
        return Settings;
      default:
        return FileText;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "teacher_added":
        return "text-blue-600";
      case "article_created":
        return "text-green-600";
      case "class_created":
        return "text-purple-600";
      case "user_created":
        return "text-orange-600";
      case "system_update":
        return "text-gray-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return <RecentActivitySkeleton />;
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 p-4 text-center text-red-700"
      >
        {t("recentActivity.loadError")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <div className="text-muted-foreground py-8 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>{t("recentActivity.empty")}</p>
        </div>
      ) : (
        activities.map((activity) => {
          const Icon = getActivityIcon(activity.type);
          const iconColor = getActivityColor(activity.type);

          return (
            <div
              key={activity.id}
              className="hover:bg-muted/50 flex items-start gap-3 rounded-lg p-3 transition-colors"
            >
              <div className={`bg-muted rounded-full p-2 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{activity.user.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {activity.description}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatDistanceToNow(activity.timestamp, {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {activities.length > 0 && (
        <div className="pt-4 text-center">
          <button className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            {t("recentActivity.viewAll")}
          </button>
        </div>
      )}
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-start gap-3 p-3">
          <div className="h-8 w-8 rounded-full bg-gray-200"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-200"></div>
            <div className="h-3 w-1/2 rounded bg-gray-200"></div>
          </div>
          <div className="h-3 w-16 rounded bg-gray-200"></div>
        </div>
      ))}
    </div>
  );
}
