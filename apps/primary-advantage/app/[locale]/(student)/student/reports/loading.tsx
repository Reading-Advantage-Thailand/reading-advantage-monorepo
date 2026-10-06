import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the student reports: the title, recent activity, the charts, and the gauge.
 * @returns The shimmer skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <ShimmerSkeleton className="h-8 w-40" />
      <ShimmerSkeleton className="h-28 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 md:col-span-2">
          <ShimmerSkeleton className="h-64 rounded-2xl" />
          <ShimmerSkeleton className="h-64 rounded-2xl" />
        </div>
        <div className="flex flex-col gap-4">
          <ShimmerSkeleton className="h-64 rounded-2xl" />
          <ShimmerSkeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
