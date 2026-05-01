'use client';

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { MasteryStrandsList } from './mastery-strands-list';
import { MasteryProfileHero } from './mastery-profile-hero';
import { MasteryProfileSkeleton } from './mastery-profile-skeleton';
import { StudentBadgesSection } from './student-badges-section';

type MasteryStatus = 'READY' | 'CALCULATING';

type StandardMastery = {
  standardId: string;
  code: string;
  titleEn: string;
  titleTh: string;
  masteryLevel: number;
  masteryLabel: string;
  masteryColorToken: string;
  evidenceCount: number;
  lastAssessedAt: string;
  aiAnnotation?: {
    recommended: boolean;
    traceId: string;
  };
};

type Strand = {
  code: string;
  title: string;
  masteryAverage: number;
  standards: StandardMastery[];
};

type MasteryProfileResponse = {
  status: MasteryStatus;
  generatedAt: string;
  retryAfterSeconds?: number;
  student: {
    id: string;
    name: string;
    grade: number | null;
  };
  strands: Strand[];
  nextCursor: string | null;
};

type StudentMasteryProfileProps = {
  studentId: string;
};

export function StudentMasteryProfile({
  studentId,
}: StudentMasteryProfileProps) {
  const [data, setData] = useState<MasteryProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  const fetchMasteryProfile = async () => {
    try {
      setError(null);
      const response = await fetch(
        `/api/students/${studentId}/mastery-profile`
      );

      if (response.status === 401) {
        setError('Please sign in to view your learning profile');
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        setError('You do not have permission to view this profile');
        setIsLoading(false);
        return;
      }

      if (response.status === 404) {
        setError('Student profile not found');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch mastery profile');
      }

      const profileData: MasteryProfileResponse = await response.json();
      setData(profileData);
      setIsLoading(false);

      // If calculating, set up polling
      if (profileData.status === 'CALCULATING') {
        if (!pollingInterval) {
          const interval = setInterval(
            fetchMasteryProfile,
            (profileData.retryAfterSeconds || 10) * 1000
          );
          setPollingInterval(interval);

          // Stop polling after 6 retries (60 seconds max)
          setTimeout(() => {
            if (interval) {
              clearInterval(interval);
              setPollingInterval(null);
            }
          }, 60000);
        }
      } else if (pollingInterval) {
        // Data is ready, clear polling
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    } catch (err) {
      console.error('Error fetching mastery profile:', err);
      setError(
        'Failed to load your learning profile. Please try again later.'
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasteryProfile();

    // Cleanup on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    fetchMasteryProfile();
  };

  // Loading state
  if (isLoading && !data) {
    return <MasteryProfileSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">
          {error}
          <div className="mt-4">
            <Button onClick={handleRetry} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (data && data.strands.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Mastery Data Yet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Complete your first lesson to start tracking your progress!
          </p>
          <Link href="/student">
            <Button>Go to Curriculum</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Calculating state (with existing data)
  const isCalculating = data?.status === 'CALCULATING';

  return (
    <div className="space-y-6">
      {/* Hero section */}
      {data && (
        <MasteryProfileHero
          studentName={data.student.name}
          gradeLevel={data.student.grade}
          totalStrands={data.strands.length}
          overallAverage={
            data.strands.length > 0
              ? data.strands.reduce((sum, s) => sum + s.masteryAverage, 0) /
                data.strands.length
              : 0
          }
        />
      )}

      {/* Calculating banner */}
      {isCalculating && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="ml-2">
            We&apos;re processing your latest quiz results. Your mastery profile
            will update automatically in a few moments.
          </AlertDescription>
        </Alert>
      )}

      {/* Strands list */}
      {data && data.strands.length > 0 && (
        <MasteryStrandsList strands={data.strands} />
      )}

      {/* Badges section */}
      <StudentBadgesSection studentId={studentId} />

      {/* Back navigation */}
      <div className="flex justify-center pt-4">
        <Link href="/student">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
