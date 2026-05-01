'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Trophy, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type RecentAchievement = {
  badgeType: string;
  unlockedAt: string;
};

type GamificationData = {
  xp: number;
  level: number;
  levelName: string;
  streak: number;
  xpProgress: {
    currentLevelXp: number;
    nextLevelXp: number;
    progressPercent: number;
  };
  recentAchievements: RecentAchievement[];
  totalAchievements: number;
};

type GamificationDashboardCardProps = {
  studentId: string;
};

const BADGE_LABELS: Record<string, string> = {
  FIRST_STEPS: 'First Steps',
  PERFECT_SCORE: 'Perfect Score',
  UNIT_CHAMPION: 'Unit Champion',
  SCIENCE_EXPLORER: 'Science Explorer',
  LAB_PARTNER: 'Lab Partner',
  BILINGUAL_SCHOLAR: 'Bilingual Scholar',
  STREAK_WARRIOR: 'Streak Warrior',
  DEDICATED_LEARNER: 'Dedicated Learner',
  QUIZ_MASTER: 'Quiz Master',
  FAST_LEARNER: 'Fast Learner',
};

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted" />
      <div className="flex gap-4">
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
      </div>
    </div>
  );
}

function DashboardError() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Complete lessons to start earning XP and badges!
      </p>
      <Link href="/student/profile">
        <Button variant="outline" className="w-full">
          View Learning Profile
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}

export function GamificationDashboardCard({
  studentId,
}: GamificationDashboardCardProps) {
  const [data, setData] = useState<GamificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const response = await fetch('/api/students/me/gamification');

        if (!response.ok) {
          setError(true);
          setIsLoading(false);
          return;
        }

        const result: GamificationData = await response.json();
        setData(result);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching gamification data:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchGamification();
  }, [studentId]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return <DashboardError />;
  }

  return (
    <div className="space-y-4">
      {/* XP and Level */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Star className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Level</p>
          <p className="text-lg font-bold">
            {data.levelName}{' '}
            <span className="text-sm font-normal text-muted-foreground">
              Lv.{data.level}
            </span>
          </p>
        </div>
      </div>

      {/* XP Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{data.xp} XP</span>
          {data.xpProgress.nextLevelXp > 0 && (
            <span>
              {data.xpProgress.currentLevelXp}/{data.xpProgress.nextLevelXp} to
              next level
            </span>
          )}
        </div>
        <Progress
          value={data.xpProgress.progressPercent}
          className="h-2"
        />
      </div>

      {/* Streak */}
      <div className="flex items-center gap-2">
        <Flame
          className={`h-5 w-5 ${data.streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}
        />
        <span className="text-sm font-medium">
          {data.streak > 0 ? (
            <>
              {data.streak} day streak
              {data.streak >= 7 && (
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  On Fire!
                </Badge>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              Start a streak by completing a lesson today!
            </span>
          )}
        </span>
      </div>

      {/* Recent Achievements */}
      {data.recentAchievements.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Badges
          </p>
          <div className="flex gap-2">
            {data.recentAchievements.map((achievement) => (
              <div
                key={achievement.badgeType}
                className="flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1"
              >
                <Trophy className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium">
                  {BADGE_LABELS[achievement.badgeType] || achievement.badgeType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Badges */}
      <Link href="/student/profile">
        <Button variant="outline" className="w-full group">
          View All Badges ({data.totalAchievements})
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  );
}
