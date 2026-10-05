import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the lesson: the header, the step rail, and the task as shimmer placeholders
 * in the same layout as the page (the rail first on phones).
 * @returns The skeleton.
 */
export default function LessonLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <ShimmerSkeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4 xl:gap-6">
        <ShimmerSkeleton className="h-24 rounded-2xl xl:order-last xl:h-96" />
        <ShimmerSkeleton className="h-96 rounded-2xl xl:col-span-3" />
      </div>
    </div>
  );
}
