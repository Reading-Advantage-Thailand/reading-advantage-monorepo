import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the student home: the same blocks as the page, as shimmer placeholders.
 * @returns The skeleton.
 */
export default function StudentHomeLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((tile) => (
          <ShimmerSkeleton key={tile} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ShimmerSkeleton className="h-44 rounded-2xl md:col-span-2" />
        <ShimmerSkeleton className="h-44 rounded-2xl" />
        <ShimmerSkeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  );
}
