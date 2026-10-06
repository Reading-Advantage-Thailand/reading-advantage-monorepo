import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the reading history: the header and the two lists.
 * @returns The shimmer skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-44" />
        <ShimmerSkeleton className="h-4 w-64" />
      </div>
      {[0, 1].map((list) => (
        <div key={list} className="flex flex-col gap-3">
          <ShimmerSkeleton className="h-6 w-40" />
          <div className="grid gap-3 md:grid-cols-2">
            <ShimmerSkeleton className="h-24 rounded-2xl" />
            <ShimmerSkeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
