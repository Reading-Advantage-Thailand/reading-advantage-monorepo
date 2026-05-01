import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';
import { MasteryProgressDisplay } from './mastery-progress-display';

type MasteryProfileHeroProps = {
  studentName: string;
  gradeLevel: number | null;
  totalStrands: number;
  overallAverage: number;
};

function getMasteryBadgeVariant(
  level: number
): 'default' | 'secondary' | 'destructive' {
  if (level < 0.6) return 'destructive';
  if (level < 0.8) return 'secondary';
  return 'default';
}

function getMasteryLabel(level: number): string {
  if (level < 0.6) return 'Needs Support';
  if (level < 0.8) return 'Developing';
  return 'Proficient';
}

export function MasteryProfileHero({
  studentName,
  gradeLevel,
  totalStrands,
  overallAverage,
}: MasteryProfileHeroProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{studentName}</CardTitle>
              {gradeLevel && (
                <p className="text-sm text-muted-foreground">
                  Grade {gradeLevel}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant={getMasteryBadgeVariant(overallAverage)}
            className="text-sm px-3 py-1"
          >
            {getMasteryLabel(overallAverage)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <MasteryProgressDisplay
          overallAverage={overallAverage}
          totalStrands={totalStrands}
          showLegend={true}
        />
      </CardContent>
    </Card>
  );
}
