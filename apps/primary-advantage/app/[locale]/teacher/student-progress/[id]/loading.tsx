import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of a student's progress page: the back link, the heading, and the report panels
 * as shimmer placeholders.
 * @returns The skeleton.
 */
export default function StudentProgressLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <ShimmerSkeleton className="h-5 w-32" />
      <ShimmerSkeleton className="h-8 w-64 max-w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        <ShimmerSkeleton className="h-48 rounded-2xl" />
        <ShimmerSkeleton className="h-48 rounded-2xl" />
        <ShimmerSkeleton className="h-64 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
