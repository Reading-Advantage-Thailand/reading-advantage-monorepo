import { ShimmerSkeleton } from "@reading-advantage/ui";

/**
 * Shimmer placeholder in the shape of the flashcard deck view. The caller marks the region busy.
 * @returns The placeholder.
 */
export function FlashcardDeckSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <ShimmerSkeleton className="h-20 rounded-2xl" />
      <ShimmerSkeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((tile) => (
          <ShimmerSkeleton key={tile} className="h-24 rounded-2xl" />
        ))}
      </div>
      <ShimmerSkeleton className="h-12 rounded-xl" />
    </div>
  );
}

/**
 * Loading state of the vocabulary and sentences pages: the title and the deck view.
 * @param props.tabs True on the sentences page, which has a row of practice tabs.
 * @returns The skeleton.
 */
export function FlashcardPageSkeleton({ tabs = false }: { tabs?: boolean }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <ShimmerSkeleton className="h-8 w-44" />
        <ShimmerSkeleton className="h-4 w-64" />
      </div>
      {tabs ? <ShimmerSkeleton className="h-12 rounded-xl" /> : null}
      <FlashcardDeckSkeleton />
    </div>
  );
}
