import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the stories shelf: the header, the tab sign, the filter panel, and book
 * covers as shimmer placeholders in the layout of the page.
 * @returns The skeleton.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-32" />
        <ShimmerSkeleton className="h-4 w-56" />
      </div>
      <ShimmerSkeleton className="h-12 w-56 rounded-full" />
      <ShimmerSkeleton className="h-36 rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((book) => (
          <ShimmerSkeleton key={book} className="aspect-[3/4] rounded-md" />
        ))}
      </div>
    </div>
  );
}
