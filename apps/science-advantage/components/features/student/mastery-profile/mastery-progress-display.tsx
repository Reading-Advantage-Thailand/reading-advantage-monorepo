import { TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

type MasteryProgressDisplayProps = {
  overallAverage: number;
  totalStrands: number;
  showLegend?: boolean;
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

export function MasteryProgressDisplay({
  overallAverage,
  totalStrands,
  showLegend = false,
}: MasteryProgressDisplayProps) {
  const masteryPercentage = Math.round(overallAverage * 100);
  const masteryLabel = getMasteryLabel(overallAverage);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Overall Mastery</span>
          </div>
          <Badge
            variant={getMasteryBadgeVariant(overallAverage)}
            className="text-xs"
          >
            {masteryLabel}
          </Badge>
        </div>
        <Progress
          value={masteryPercentage}
          className="h-3"
          aria-label={`Overall mastery ${masteryPercentage}% - ${masteryLabel}`}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xl font-bold">{masteryPercentage}%</span>
          <span className="text-xs text-muted-foreground">
            Across {totalStrands} science strand{totalStrands !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {showLegend && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-2">Mastery Levels:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">&lt;60%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-secondary" />
              <span className="text-muted-foreground">60-79%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">≥80%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
