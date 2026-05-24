import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatStudentCount, getStandardsAlignmentLabel } from "@/lib/utils/class-format";
import type { StandardsAlignment } from "@/lib/enums";

interface ClassSnapshotPanelProps {
  gradeLevel: number;
  standardsAlignment: StandardsAlignment;
  studentCount: number;
}

export function ClassSnapshotPanel({
  gradeLevel,
  standardsAlignment,
  studentCount,
}: ClassSnapshotPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Snapshot</CardTitle>
        <CardDescription>Quick metrics for roster and alignment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Students</p>
          <p className="text-xl font-semibold text-gray-900">{formatStudentCount(studentCount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Standards Alignment</p>
          <p className="text-base font-medium text-gray-900">
            {getStandardsAlignmentLabel(standardsAlignment)}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Grade Level</p>
          <p className="text-base font-medium text-gray-900">Grade {gradeLevel}</p>
        </div>
      </CardContent>
    </Card>
  );
}
