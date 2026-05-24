'use client';

import { useEffect, useState } from 'react';
import {
  Loader2,
  Star,
  Trophy,
  Crown,
  Compass,
  FlaskConical,
  Languages,
  Flame,
  CalendarCheck,
  ScrollText,
  Zap,
  Footprints,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BADGE_DEFINITIONS } from '@/lib/gamification/badges.constants';

type Achievement = {
  badgeType: string;
  unlockedAt: string;
};

type AchievementsResponse = {
  achievements: Achievement[];
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Footprints,
  Trophy,
  Crown,
  Compass,
  FlaskConical,
  Languages,
  Flame,
  CalendarCheck,
  ScrollText,
  Zap,
  Star,
};

type StudentBadgesSectionProps = {
  studentId: string;
};

export function StudentBadgesSection({ studentId }: StudentBadgesSectionProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetch(
          `/api/students/${studentId}/achievements`
        );

        if (response.ok) {
          const data: AchievementsResponse = await response.json();
          setAchievements(data.achievements);
        }
      } catch (err) {
        console.error('Error fetching achievements:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAchievements();
  }, [studentId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const earnedBadgeTypes = new Set(achievements.map((a) => a.badgeType));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Badges ({achievements.length}/{BADGE_DEFINITIONS.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {BADGE_DEFINITIONS.map((badgeDef) => {
            const isEarned = earnedBadgeTypes.has(badgeDef.id);
            const achievement = achievements.find(
              (a) => a.badgeType === badgeDef.id
            );
            const IconComponent =
              ICON_MAP[badgeDef.icon] || Star;

            return (
              <div
                key={badgeDef.id}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                  isEarned
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border bg-muted/30 opacity-50 grayscale'
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    isEarned ? 'bg-primary/10' : 'bg-muted'
                  }`}
                >
                  <IconComponent
                    className={`h-6 w-6 ${
                      isEarned ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <div className="text-center">
                  <p
                    className={`text-sm font-medium ${
                      isEarned ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {badgeDef.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {badgeDef.description}
                  </p>
                  {isEarned && achievement && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Badge>
                  )}
                  {!isEarned && (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Locked
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
