'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, AlertTriangle, Clock, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface InterventionSummary {
  totalAlerts: number;
  critical: number;
  warning: number;
  moderate: number;
}

interface ClassInterventionSummaryProps {
  classId: string;
}

export function ClassInterventionSummary({ classId }: ClassInterventionSummaryProps) {
  const [summary, setSummary] = useState<InterventionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(
          `/api/teachers/classes/${classId}/intervention-alerts?limit=100`
        );
        if (res.ok) {
          const data = await res.json();
          const critical = data.alerts.filter(
            (a: { alertSeverity: string }) => a.alertSeverity === 'critical'
          ).length;
          const warning = data.alerts.filter(
            (a: { alertSeverity: string }) => a.alertSeverity === 'warning'
          ).length;
          const moderate = data.alerts.filter(
            (a: { alertSeverity: string }) => a.alertSeverity === 'moderate'
          ).length;

          setSummary({
            totalAlerts: data.totalAlerts,
            critical,
            warning,
            moderate,
          });
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [classId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Loading intervention data...
            </CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!summary || summary.totalAlerts === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium">
              Intervention Alerts
            </CardTitle>
            <CardDescription>
              Students who may need additional support
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-xs">
            {summary.totalAlerts}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm">
          {summary.critical > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-700">{summary.critical}</span>
              <span className="text-muted-foreground">critical</span>
            </div>
          )}
          {summary.warning > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="font-medium text-amber-700">{summary.warning}</span>
              <span className="text-muted-foreground">warning</span>
            </div>
          )}
          {summary.moderate > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-700">{summary.moderate}</span>
              <span className="text-muted-foreground">moderate</span>
            </div>
          )}
        </div>
        <Link
          href={`/teacher/classes/${classId}/analytics?tab=interventions`}
          className="mt-3 inline-block text-xs font-medium text-rose-600 hover:text-rose-700"
        >
          View all alerts →
        </Link>
      </CardContent>
    </Card>
  );
}
