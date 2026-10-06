import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the teacher dashboard: the same blocks as the page, as shimmer placeholders.
 * @returns The skeleton.
 */
export default function TeacherDashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-56" />
        <ShimmerSkeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <ShimmerSkeleton key={tile} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ShimmerSkeleton className="h-40 rounded-2xl lg:col-span-2" />
        <ShimmerSkeleton className="h-24 rounded-2xl lg:col-span-2" />
        <ShimmerSkeleton className="h-56 rounded-2xl" />
        <ShimmerSkeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  );
}
