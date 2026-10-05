import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Loading state of the article view: the article card and the side column (tools and
 * question cards) as shimmer placeholders in the same layout as the page.
 * @returns The skeleton.
 */
export default function ArticleLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="bg-card flex min-w-0 flex-col gap-4 rounded-2xl border p-6 xl:basis-3/5">
        <ShimmerSkeleton className="h-10 w-3/4" />
        <div className="flex gap-2">
          <ShimmerSkeleton className="h-6 w-14 rounded-full" />
          <ShimmerSkeleton className="h-6 w-28 rounded-full" />
        </div>
        <ShimmerSkeleton className="h-16 w-full" />
        <ShimmerSkeleton className="h-12 w-full" />
        <ShimmerSkeleton className="h-96 w-full" />
      </div>
      <div className="flex min-w-0 flex-col gap-4 xl:basis-2/5">
        <ShimmerSkeleton className="h-20 rounded-2xl" />
        <ShimmerSkeleton className="h-40 rounded-2xl" />
        <ShimmerSkeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}
