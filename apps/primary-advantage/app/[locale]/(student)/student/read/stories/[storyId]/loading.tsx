import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the story page: the back button, the cover panel, the signs, and chapter
 * rows as shimmer placeholders in the layout of the page.
 * @returns The skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <ShimmerSkeleton className="h-12 w-40 rounded-full" />
      <div className="flex flex-col gap-4 md:flex-row">
        <ShimmerSkeleton className="mx-auto aspect-[3/4] w-40 rounded-md md:w-56" />
        <div className="flex flex-1 flex-col gap-3">
          <ShimmerSkeleton className="h-8 w-2/3" />
          <ShimmerSkeleton className="h-6 w-1/2" />
          <ShimmerSkeleton className="h-20 w-full" />
        </div>
      </div>
      <ShimmerSkeleton className="h-12 w-64 rounded-full" />
      {[0, 1, 2].map((row) => (
        <ShimmerSkeleton key={row} className="h-14 rounded-md" />
      ))}
    </div>
  );
}
