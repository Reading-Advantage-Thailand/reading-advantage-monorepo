import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Shimmer placeholders in the shape of the assignment cards. The caller marks the region busy.
 * @param props.count The number of cards.
 * @returns The placeholder cards.
 */
export function AssignmentCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }, (_, card) => (
        <ShimmerSkeleton key={card} className="h-48 rounded-2xl" />
      ))}
    </div>
  );
}

/**
 * Loading state of the assignments page: the header, the filter panel, and the cards.
 * @returns The skeleton.
 */
export function AssignmentListSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-4 w-40" />
      </div>
      <ShimmerSkeleton className="h-40 rounded-2xl" />
      <AssignmentCardsSkeleton />
    </div>
  );
}
