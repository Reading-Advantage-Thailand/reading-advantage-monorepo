"use client";

import { useEffect, useState, useCallback } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AIInsight } from "@/types/dashboard";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  Sparkles,
  X,
  Check,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "performance" | "engagement" | "content" | "user-experience";
  estimatedImpact: string;
  actions: string[];
}

interface AIInsightsProps {
  className?: string;
  scope?: "student" | "teacher" | "classroom" | "license" | "system";
  contextId?: string; // userId, classroomId, or licenseId
}

export default function AIInsights({
  className,
  scope,
  contextId,
}: AIInsightsProps) {
  const t = useScopedI18n("components.aiInsights");
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAIData = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (scope) params.append("kind", scope);
        if (contextId) {
          if (scope === "classroom") params.append("classroomId", contextId);
          else if (scope === "license") params.append("licenseId", contextId);
          else params.append("userId", contextId);
        }
        if (forceRefresh) params.append("refresh", "true");

        // Fetch AI summary data from the API
        const response = await fetch(`/api/v1/ai/summary?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch AI insights");
        }

        const data = await response.json();

        // Use insights from API response
        setInsights(data.insights || []);

        // Generate smart suggestions based on insights with scope-aware action items
        const getActionItems = (scope?: string) => {
          if (scope === "student") {
            return [
              "Review your progress",
              "Set personal goals",
              "Practice regularly",
              "Track your improvement",
            ];
          } else if (scope === "teacher") {
            return [
              "Review class performance",
              "Adjust teaching strategies",
              "Provide targeted support",
              "Monitor student progress",
            ];
          } else if (scope === "license" || scope === "system") {
            return [
              "Review the metrics",
              "Plan strategic actions",
              "Allocate resources effectively",
              "Monitor implementation",
            ];
          }
          return [
            "Review the recommendation",
            "Plan next steps",
            "Take action",
            "Monitor results",
          ];
        };

        const generatedSuggestions: SmartSuggestion[] = data.insights
          .filter((insight: AIInsight) => insight.type === "recommendation")
          .slice(0, 3)
          .map((insight: AIInsight, idx: number) => ({
            id: `suggestion-${idx}`,
            title: insight.title,
            description: insight.description,
            priority: insight.priority,
            category: "performance",
            estimatedImpact: "Data-driven improvement",
            actions: getActionItems(scope),
          }));

        setSuggestions(generatedSuggestions);
      } catch (err) {
        console.error("Error fetching AI insights:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load AI insights"
        );
      } finally {
        setLoading(false);
      }
    },
    [scope, contextId]
  ); // Add dependencies

  useEffect(() => {
    fetchAIData();
  }, [fetchAIData]); // Depend on fetchAIData

  const handleDismiss = async (insightId: string) => {
    try {
      const response = await fetch("/api/v1/ai/insights/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId }),
      });

      if (!response.ok) throw new Error("Failed to dismiss insight");

      // Remove from UI
      setInsights(insights.filter((i) => i.id !== insightId));

      toast({
        title: t("toast.dismiss.title"),
        description: t("toast.dismiss.description"),
      });
    } catch (err) {
      toast({
        title: t("toast.dismissError.title"),
        description: t("toast.dismissError.description"),
        variant: "destructive",
      });
    }
  };

  const handleMarkAction = async (insightId: string) => {
    try {
      const response = await fetch("/api/v1/ai/insights/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ insightId }),
      });

      if (!response.ok) throw new Error("Failed to mark action");

      toast({
        title: t("toast.actionRecorded.title"),
        description: t("toast.actionRecorded.description"),
      });
    } catch (err) {
      toast({
        title: t("toast.actionError.title"),
        description: t("toast.actionError.description"),
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    await fetchAIData(true);
    toast({
      title: t("toast.refreshed.title"),
      description: t("toast.refreshed.description"),
    });
  };

  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "trend":
        return TrendingUp;
      case "alert":
        return AlertTriangle;
      case "recommendation":
        return Lightbulb;
      case "achievement":
        return Target;
      default:
        return Brain;
    }
  };

  const getInsightColor = (type: AIInsight["type"]) => {
    switch (type) {
      case "trend":
        return "text-green-600";
      case "alert":
        return "text-orange-600";
      case "recommendation":
        return "text-blue-600";
      case "achievement":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "engagement":
        return Users;
      case "performance":
        return TrendingUp;
      case "content":
        return BookOpen;
      case "user-experience":
        return Sparkles;
      default:
        return Zap;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`grid gap-6 lg:grid-cols-2 ${className}`}>
      {/* AI Insights - Redesigned with compact cards */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <CardTitle>{t("insights.title")}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <CardDescription>{t("insights.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {insights.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("insights.empty")}
              </p>
            )}
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div
                  key={insight.id}
                  className="group relative flex items-start gap-3 p-3 border rounded-lg hover:shadow-md transition-all duration-200"
                >
                  {/* Icon with colored background */}
                  <div
                    className={`p-2 rounded-lg ${getInsightColor(insight.type).replace("text-", "bg-").replace("-600", "-100")} dark:bg-opacity-20`}
                  >
                    <Icon
                      className={`h-4 w-4 ${getInsightColor(insight.type)}`}
                    />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Title and badges */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm leading-tight">
                        {insight.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {Math.round(insight.confidence * 100)}%
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>

                    {/* Footer: Type, Priority, Actions */}
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs capitalize">
                        {insight.type}
                      </Badge>
                      <Badge
                        className={`text-xs ${getPriorityColor(insight.priority)}`}
                        variant="secondary"
                      >
                        {insight.priority}
                      </Badge>
                      <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleDismiss(insight.id)}
                        >
                          {t("actions.done")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Smart Suggestions - Redesigned with compact layout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            {t("suggestions.title")}
          </CardTitle>
          <CardDescription>{t("suggestions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suggestions.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t("suggestions.empty")}
              </p>
            )}
            {suggestions.map((suggestion) => {
              const CategoryIcon = getCategoryIcon(suggestion.category);
              return (
                <div
                  key={suggestion.id}
                  className="group border rounded-lg p-3 space-y-2 hover:shadow-md transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CategoryIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <h4 className="font-medium text-sm truncate">
                        {suggestion.title}
                      </h4>
                    </div>
                    <Badge
                      className={`text-xs shrink-0 ${getPriorityColor(suggestion.priority)}`}
                      variant="secondary"
                    >
                      {suggestion.priority}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>

                  {/* Impact */}
                  <div className="flex items-center gap-2 text-xs">
                    <Target className="h-3 w-3 text-green-600" />
                    <span className="text-muted-foreground">
                      {t("suggestions.impact")}
                    </span>
                    <span className="text-green-600 font-medium">
                      {suggestion.estimatedImpact}
                    </span>
                  </div>

                  {/* Action Items - Collapsible on small screens */}
                  <details className="group/details">
                    <summary className="text-xs font-medium cursor-pointer list-none flex items-center gap-1 text-muted-foreground hover:text-foreground">
                      <ArrowRight className="h-3 w-3 transition-transform group-open/details:rotate-90" />
                      {t("suggestions.actionItems", {
                        count: suggestion.actions.length,
                      })}
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {suggestion.actions.map((action, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-xs text-muted-foreground"
                        >
                          <div className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
