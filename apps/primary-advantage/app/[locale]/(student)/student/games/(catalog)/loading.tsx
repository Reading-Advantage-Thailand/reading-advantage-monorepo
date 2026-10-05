import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the games catalog: the header and two groups of game cards.
 * @returns The shimmer skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-32" />
        <ShimmerSkeleton className="h-4 w-64" />
      </div>
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-3">
          <ShimmerSkeleton className="h-6 w-40" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((card) => (
              <ShimmerSkeleton key={card} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
