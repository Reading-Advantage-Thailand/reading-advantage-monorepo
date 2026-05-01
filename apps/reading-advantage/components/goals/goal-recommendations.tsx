"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, TrendingUp } from "lucide-react";

interface Recommendation {
  type: string;
  title: string;
  description: string;
  targetValue: number;
  unit: string;
  suggestedDuration: number;
  reason: string;
  priority: string;
}

interface GoalRecommendationsProps {
  userId: string;
  onCreateGoal: () => void;
}

export function GoalRecommendations({
  userId,
  onCreateGoal,
}: GoalRecommendationsProps) {
  const [recommendations, setRecommendations] = React.useState<Recommendation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch("/api/v1/goals/recommendations");
        if (res.ok) {
          const data = await res.json();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  const handleCreateFromRecommendation = async (rec: Recommendation) => {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + rec.suggestedDuration);

      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: rec.type,
          title: rec.title,
          description: rec.description,
          targetValue: rec.targetValue,
          unit: rec.unit,
          targetDate,
          priority: rec.priority,
        }),
      });

      if (res.ok) {
        onCreateGoal();
      }
    } catch (error) {
      console.error("Error creating goal:", error);
    }
  };

  if (loading || recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <CardTitle>Recommended Goals</CardTitle>
        </div>
        <CardDescription>
          AI-powered suggestions based on your learning activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">{rec.title}</h4>
                  <Badge variant="outline">{rec.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {rec.description}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  💡 {rec.reason}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleCreateFromRecommendation(rec)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Goal
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
