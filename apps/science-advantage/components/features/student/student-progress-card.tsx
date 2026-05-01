'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { MasteryProgressDisplay } from './mastery-profile/mastery-progress-display';

type StudentProgressCardProps = {
  studentId: string;
};

type MasteryStrand = {
  masteryAverage: number;
};

type MasteryProfileResponse = {
  strands: MasteryStrand[];
};

export function StudentProgressCard({ studentId }: StudentProgressCardProps) {
  const [overallMastery, setOverallMastery] = useState<number | null>(null);
  const [strandCount, setStrandCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMasteryData = async () => {
      try {
        const response = await fetch(
          `/api/students/${studentId}/mastery-profile?limit=200`
        );

        if (!response.ok) {
          setError(true);
          setIsLoading(false);
          return;
        }

        const data: MasteryProfileResponse = await response.json();

        if (data.strands.length > 0) {
          const totalMastery = data.strands.reduce(
            (sum, strand) => sum + strand.masteryAverage,
            0
          );
          const average = totalMastery / data.strands.length;
          setOverallMastery(average);
          setStrandCount(data.strands.length);
        } else {
          setOverallMastery(null);
          setStrandCount(0);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching mastery data:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchMasteryData();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || overallMastery === null) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete lessons to start tracking your mastery progress!
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

  return (
    <div className="space-y-4">
      {/* Reuse the existing MasteryProgressDisplay component */}
      <MasteryProgressDisplay
        overallAverage={overallMastery}
        totalStrands={strandCount}
        showLegend={true}
      />

      <Link href="/student/profile">
        <Button variant="outline" className="w-full group">
          View Detailed Profile
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </Link>
    </div>
  );
}
