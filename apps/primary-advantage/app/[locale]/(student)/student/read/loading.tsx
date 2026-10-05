import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the read list: the header, the filter panel, and story cards as shimmer
 * placeholders in the same layout as the page.
 * @returns The skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-32" />
        <ShimmerSkeleton className="h-4 w-56" />
        <ShimmerSkeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
        <ShimmerSkeleton className="h-4 w-28" />
        <div className="flex flex-wrap gap-2">
          <ShimmerSkeleton className="h-12 w-28 rounded-full" />
          <ShimmerSkeleton className="h-12 w-32 rounded-full" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <ShimmerSkeleton key={card} className="h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
