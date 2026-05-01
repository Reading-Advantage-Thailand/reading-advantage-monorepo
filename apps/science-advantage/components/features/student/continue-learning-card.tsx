"use client";

import Link from 'next/link';
import { Compass } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ContinueLearningCardProps {
  classId: string;
  lessonSlug: string;
}

export function ContinueLearningCard({ classId, lessonSlug }: ContinueLearningCardProps) {
  return (
    <Card data-testid="continue-learning-card">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg">Continue Learning</CardTitle>
          <p className="text-sm text-muted-foreground">
            Review this lesson again or jump to the next topic in your curriculum.
          </p>
        </div>
        <Compass className="h-8 w-8 text-rose-500" aria-hidden />
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Keep practicing to improve your mastery and unlock new recommendations.
        </p>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href={`/student/classes/${classId}`}>View Class</Link>
          </Button>
          <Button asChild>
            <Link href={`/student/classes/${classId}/lessons/${lessonSlug}`}>Replay Lesson</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
