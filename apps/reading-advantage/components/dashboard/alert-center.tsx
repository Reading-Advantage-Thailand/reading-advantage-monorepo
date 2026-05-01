"use client";

import React, { useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { WidgetShell } from "./widget-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert as AlertType } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bell,
  Clock,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AlertCenterProps {
  licenseId?: string;
  maxAlerts?: number;
  onAlertClick?: (alert: AlertType) => void;
  onViewAll?: () => void;
  className?: string;
}

export function AlertCenter({
  licenseId,
  maxAlerts = 5,
  onAlertClick,
  onViewAll,
  className,
}: AlertCenterProps) {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'unacknowledged'>('unacknowledged');
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<'all' | 'critical' | 'unacknowledged'>('all');
  const t = useScopedI18n("components.alertCenter") as any;

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (licenseId) params.append('licenseId', licenseId);

      const response = await fetch(`/api/v1/admin/alerts?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const result = await response.json();
      setAlerts(result.alerts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [licenseId]);

  const filteredAlerts = alerts
    .filter((alert) => {
      if (filter === 'critical') return alert.severity === 'critical';
      if (filter === 'unacknowledged') return !alert.acknowledged;
      return true;
    })
    .slice(0, maxAlerts);

  const getSeverityIcon = (severity: AlertType['severity']) => {
    switch (severity) {
      case 'critical':
        return AlertCircle;
      case 'high':
        return AlertTriangle;
      case 'medium':
        return Info;
      default:
        return Bell;
    }
  };

  const getSeverityColor = (severity: AlertType['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900';
    }
  };

  const getTypeLabel = (type: AlertType['type']) => {
    switch (type) {
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Info';
    }
  };

  const handleAcknowledge = async (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/v1/admin/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });

      if (response.ok) {
        setAlerts(prev =>
          prev.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          )
        );
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  const handleViewAll = () => {
    setShowAllDialog(true);
    onViewAll?.();
  };

  const getDialogFilteredAlerts = () => {
    return alerts.filter((alert) => {
      if (dialogFilter === 'critical') return alert.severity === 'critical';
      if (dialogFilter === 'unacknowledged') return !alert.acknowledged;
      return true;
    });
  };

  const dialogFilteredAlerts = getDialogFilteredAlerts();

  return (
    <>
    <WidgetShell
      title={t("title")}
      description={`${unacknowledgedCount} ${t("unacknowledged")}`}
      icon={Bell}
      loading={loading}
      error={error}
      isEmpty={filteredAlerts.length === 0}
      emptyMessage={t("noAlerts")}
      emptyIcon={CheckCircle2}
      onRefresh={fetchAlerts}
      onViewAll={handleViewAll}
      viewAllLabel={t("viewAll")}
      className={className}
      headerAction={
        <div className="flex gap-1 border rounded-md p-1">
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              filter === 'unacknowledged' && "bg-primary text-primary-foreground"
            )}
            onClick={() => setFilter('unacknowledged')}
            >
            {t("filter.unread")}
            {unacknowledgedCount > 0 && (
              <span className="ml-1 px-1 rounded-full bg-red-500 text-white text-[10px]">
                {unacknowledgedCount}
              </span>
            )}
          </button>
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              filter === 'critical' && "bg-primary text-primary-foreground"
            )}
            onClick={() => setFilter('critical')}
            >
            {t("filter.critical")}
            {criticalCount > 0 && (
              <span className="ml-1 px-1 rounded-full bg-red-500 text-white text-[10px]">
                {criticalCount}
              </span>
            )}
          </button>
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              filter === 'all' && "bg-primary text-primary-foreground"
            )}
            onClick={() => setFilter('all')}
            >
            {t("filter.all")}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const SeverityIcon = getSeverityIcon(alert.severity);
          
          return (
            <div
              key={alert.id}
              className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                getSeverityColor(alert.severity),
                alert.acknowledged && "opacity-60"
              )}
              onClick={() => onAlertClick?.(alert)}
            >
              <div className="flex items-start gap-3">
                <SeverityIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm line-clamp-1">
                      {alert.title}
                    </h4>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {getTypeLabel(alert.type)}
                    </Badge>
                  </div>
                  <p className="text-xs mb-2 line-clamp-2">
                    {alert.message}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      {alert.schoolName && (
                        <span className="font-medium">{alert.schoolName}</span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                      {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                      >
                        {t("markRead")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </WidgetShell>

    {/* View All Alerts Dialog */}
    <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {alerts.length} {t("dialog.total")} • {unacknowledgedCount} {t("unacknowledged")} • {criticalCount} {t("critical")}
          </DialogDescription>
        </DialogHeader>

        {/* Filter Buttons */}
        <div className="flex gap-2 border-b pb-3">
          <Button
            variant={dialogFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDialogFilter('all')}
          >
            {t("dialog.all")} ({alerts.length})
          </Button>
          <Button
            variant={dialogFilter === 'unacknowledged' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDialogFilter('unacknowledged')}
          >
            {t("dialog.unread")} ({unacknowledgedCount})
          </Button>
          <Button
            variant={dialogFilter === 'critical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDialogFilter('critical')}
          >
            {t("dialog.critical")} ({criticalCount})
          </Button>
        </div>

        {/* Alerts List */}
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {dialogFilteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {t("dialog.noAlertsCategory")}
                </p>
              </div>
            ) : (
              dialogFilteredAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all hover:shadow-md",
                      getSeverityColor(alert.severity),
                      alert.acknowledged && "opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <SeverityIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">
                                {alert.title}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "text-xs",
                                  alert.severity === 'critical' && "border-red-500 text-red-700 dark:text-red-400",
                                  alert.severity === 'high' && "border-orange-500 text-orange-700 dark:text-orange-400"
                                )}
                              >
                                {alert.severity}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {getTypeLabel(alert.type)}
                              </Badge>
                              {alert.acknowledged && (
                                <Badge variant="outline" className="text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {t("read")}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm mb-3">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center justify-between gap-2 pt-2 border-t">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {alert.schoolName && (
                              <span className="font-medium text-foreground">
                                {alert.schoolName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {!alert.acknowledged && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcknowledge(alert.id, e);
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t("markRead")}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                onAlertClick?.(alert);
                                setShowAllDialog(false);
                              }}
                            >
                              {t("viewDetails")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
    </>
  );
}
