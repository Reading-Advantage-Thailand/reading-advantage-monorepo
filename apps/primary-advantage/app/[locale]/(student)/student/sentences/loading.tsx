import { FlashcardPageSkeleton } from "@/components/flashcards/flashcard-dashboard-skeleton";

/**
 * Loading state of the sentences page.
 * @returns The shimmer skeleton in the shape of the page.
 */
export default function Loading() {
  return <FlashcardPageSkeleton tabs />;
}
