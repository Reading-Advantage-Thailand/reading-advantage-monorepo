import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the teacher reports: the heading, the filters, the tiles, and the table as
 * shimmer placeholders.
 * @returns The skeleton.
 */
export default function TeacherReportsLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-3">
        <ShimmerSkeleton className="h-11 w-56" />
        <ShimmerSkeleton className="h-11 flex-1 basis-56" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((tile) => (
          <ShimmerSkeleton key={tile} className="h-20 rounded-2xl" />
        ))}
      </div>
      <ShimmerSkeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
