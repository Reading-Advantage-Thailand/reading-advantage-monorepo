"use client";

import { useEffect, useState, useCallback } from "react";
import { VelocityMetrics } from "@/server/services/metrics/velocity-service";
import { GenreMetricsResponse } from "@/server/services/metrics/genre-engagement-service";
import { toast } from "@/components/ui/use-toast";

interface DashboardData {
    velocity: VelocityMetrics | null;
    genres: GenreMetricsResponse | null;
    srsHealth: any | null;
    aiInsights: any | null;
    activityTimeline: any | null;
}

export function useDashboardMetrice(userId: string) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<DashboardData>({
        velocity: null,
        genres: null,
        srsHealth: null,
        aiInsights: null,
        activityTimeline: null,
    });

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [velocityRes, genresRes, srsRes, aiRes, activityRes] =
                await Promise.allSettled([
                    fetch(`/api/v1/metrics/velocity?studentId=${userId}`),
                    fetch(
                        `/api/v1/metrics/genres?studentId=${userId}&timeframe=30d&enhanced=true&includeRecommendations=true`
                    ),
                    fetch(`/api/v1/metrics/srs?studentId=${userId}&includeDetails=true`),
                    fetch(`/api/v1/ai/summary?userId=${userId}&kind=student`),
                    fetch(
                        `/api/v1/metrics/activity?entityId=${userId}&scope=student&format=timeline&timeframe=30d`
                    ),
                ]);

            // Process velocity data
            if (velocityRes.status === "fulfilled" && velocityRes.value.ok) {
                const velocityData = await velocityRes.value.json();

                // Check if response has student scope structure
                if (velocityData.scope === "student" && velocityData.student) {
                    setData((prev) => ({ ...prev, velocity: velocityData.student }));
                } else {
                    console.error("Unexpected velocity data structure:", velocityData);
                }
            } else if (velocityRes.status === "fulfilled") {
                console.error("Velocity fetch failed:", await velocityRes.value.text());
            }
            // Process genre data
            if (genresRes.status === "fulfilled" && genresRes.value.ok) {
                const genreData = await genresRes.value.json();
                setData((prev) => ({ ...prev, genres: genreData }));
            } else if (genresRes.status === "fulfilled") {
                console.error("Genre fetch failed:", await genresRes.value.text());
            }
            // Process SRS health data
            if (srsRes.status === "fulfilled" && srsRes.value.ok) {
                const srsData = await srsRes.value.json();

                // Check if response has student scope structure
                if (srsData.scope === "student" && srsData.student) {
                    setData((prev) => ({ ...prev, srsHealth: srsData }));
                } else {
                    console.error(
                        "Unexpected SRS data structure - expected student scope:",
                        srsData
                    );
                }
            } else if (srsRes.status === "fulfilled") {
                console.error("SRS fetch failed:", await srsRes.value.text());
            }
            // Process AI insights (optional)
            if (aiRes.status === "fulfilled" && aiRes.value.ok) {
                const aiData = await aiRes.value.json();
                setData((prev) => ({ ...prev, aiInsights: aiData }));
            }
            // Process activity timeline
            if (activityRes.status === "fulfilled" && activityRes.value.ok) {
                const activityData = await activityRes.value.json();
                setData((prev) => ({ ...prev, activityTimeline: activityData }));
            }
        } catch (e: any) {
            setError(e instanceof Error ? e : new Error(String(e)));
            toast({
                title: "Fail.",
                description: `Failed to load dashboard data: ${e instanceof Error ? e.message : String(e)}`,
            });
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;
        void fetchDashboardData();
    }, [userId]);

    return { data, loading, error, refresh: fetchDashboardData } as const;
}