"use client";

import React, { useEffect } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  RefreshCw,
  Info,
  ChevronRight,
  LucideIcon,
} from "lucide-react";

export interface WidgetShellProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  onRefresh?: () => void;
  onViewAll?: () => void;
  viewAllLabel?: string;
  refreshing?: boolean;
  className?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  telemetryId?: string;
  onView?: () => void;
}

export function WidgetShell({
  title,
  description,
  icon: Icon,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = "No data available",
  emptyIcon: EmptyIcon = Info,
  onRefresh,
  onViewAll,
  viewAllLabel = "View All",
  refreshing = false,
  className,
  headerAction,
  footer,
  children,
  telemetryId,
  onView,
}: WidgetShellProps) {
  const t = useScopedI18n("components.widgetShell") as any;
  
  // Track widget view for telemetry
  useEffect(() => {
    if (onView && !loading && !error) {
      onView();
    }
  }, [loading, error, onView]);

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="mt-1">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {description && (
                <CardDescription className="text-sm">{description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing || loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    refreshing && "animate-spin"
                  )}
                />
                <span className="sr-only">{t("refresh")}</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {loading ? (
          <WidgetLoadingState />
        ) : error ? (
          <WidgetErrorState error={error} onRetry={onRefresh} tryAgainLabel={t("tryAgain")} />
        ) : isEmpty ? (
          <WidgetEmptyState message={emptyMessage || t("noData")} Icon={EmptyIcon} />
        ) : (
          children
        )}
      </CardContent>

      {(footer || onViewAll) && !loading && !error && (
        <CardFooter className="pt-0 border-t">
          {footer || (
            onViewAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewAll}
                className="w-full"
              >
                {viewAllLabel || t("viewAll")}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )
          )}
        </CardFooter>
      )}
    </Card>
  );
}

function WidgetLoadingState() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}

function WidgetErrorState({
  error,
  onRetry,
  tryAgainLabel,
}: {
  error: string;
  onRetry?: () => void;
  tryAgainLabel?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-3">
        <span>{error}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {tryAgainLabel || "Try Again"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

function WidgetEmptyState({
  message,
  Icon,
}: {
  message: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export { WidgetLoadingState, WidgetErrorState, WidgetEmptyState };
