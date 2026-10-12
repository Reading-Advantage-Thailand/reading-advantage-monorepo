import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the chapter page: the back button, the title panel with the read-along
 * passage, the word list row, the question panels, and the chapter navigation as shimmer
 * placeholders in the layout of the page.
 * @returns The skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <ShimmerSkeleton className="h-12 w-40 rounded-full" />
      <div className="flex flex-col gap-3">
        <ShimmerSkeleton className="h-6 w-32" />
        <ShimmerSkeleton className="h-8 w-2/3" />
        <ShimmerSkeleton className="h-64 w-full" />
      </div>
      <ShimmerSkeleton className="h-12 w-48 rounded-full" />
      <ShimmerSkeleton className="h-40 w-full" />
      <div className="flex gap-2">
        <ShimmerSkeleton className="h-12 w-36 rounded-full" />
        <ShimmerSkeleton className="h-12 w-36 rounded-full" />
      </div>
    </div>
  );
}
