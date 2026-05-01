'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

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

type MasteryStrandsListProps = {
  strands: Strand[];
};

function getColorClasses(colorToken: string) {
  const classes = {
    critical: 'border-destructive bg-destructive/10 text-destructive',
    caution: 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
    strong: 'border-green-600 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  };
  return classes[colorToken as keyof typeof classes] || classes.critical;
}

function getBadgeVariant(
  colorToken: string
): 'default' | 'secondary' | 'destructive' {
  if (colorToken === 'critical') return 'destructive';
  if (colorToken === 'caution') return 'secondary';
  return 'default';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function StrandIcon({ level }: { level: number }) {
  if (level >= 0.8) {
    return <CheckCircle2 className="h-10 w-10 text-green-600" />;
  }
  return <Circle className="h-10 w-10 text-muted-foreground" />;
}

export function MasteryStrandsList({ strands }: MasteryStrandsListProps) {
  // Default open the weakest strand (first in sorted list)
  const defaultOpenStrand = strands.length > 0 ? strands[0].code : undefined;

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpenStrand}>
      {strands.map((strand) => {
        const masteryPercentage = Math.round(strand.masteryAverage * 100);

        return (
          <AccordionItem key={strand.code} value={strand.code}>
            <Card className="mb-4">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <StrandIcon level={strand.masteryAverage} />
                    <div className="text-left">
                      <CardTitle className="text-xl">
                        {strand.code}: {strand.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress
                          value={masteryPercentage}
                          className="h-2 w-48"
                          aria-label={`Strand mastery ${masteryPercentage}%`}
                        />
                        <span className="text-sm font-medium text-muted-foreground">
                          {masteryPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      strand.masteryAverage >= 0.8
                        ? 'default'
                        : strand.masteryAverage >= 0.6
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="ml-4"
                  >
                    {strand.standards.length} standard
                    {strand.standards.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {strand.standards.map((standard) => {
                      const masteryPercentage = Math.round(
                        standard.masteryLevel * 100
                      );

                      return (
                        <div
                          key={standard.standardId}
                          className={`p-4 border-2 rounded-lg transition-colors hover:bg-accent/50 ${getColorClasses(standard.masteryColorToken)}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-sm font-medium">
                                  {standard.code}
                                </span>
                                <Badge
                                  variant={getBadgeVariant(
                                    standard.masteryColorToken
                                  )}
                                  className="text-xs"
                                >
                                  {standard.masteryLabel}
                                </Badge>
                                {standard.aiAnnotation?.recommended && (
                                  <Badge variant="outline" className="text-xs">
                                    AI Recommended
                                  </Badge>
                                )}
                              </div>

                              <p className="text-sm leading-relaxed">
                                {standard.titleEn}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>
                                    Last assessed{' '}
                                    {formatRelativeTime(
                                      standard.lastAssessedAt
                                    )}
                                  </span>
                                </div>
                                <div>
                                  {standard.evidenceCount} question
                                  {standard.evidenceCount !== 1 ? 's' : ''}{' '}
                                  answered
                                </div>
                              </div>
                            </div>

                            <div className="text-right min-w-[100px]">
                              <div className="text-2xl font-bold">
                                {masteryPercentage}%
                              </div>
                              <Progress
                                value={masteryPercentage}
                                className="h-2 mt-2"
                                aria-valuenow={masteryPercentage}
                                aria-valuetext={`Mastery ${masteryPercentage}% - ${standard.masteryLabel}`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
