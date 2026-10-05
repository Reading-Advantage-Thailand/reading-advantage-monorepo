import { FlashcardPageSkeleton } from "@/components/flashcards/flashcard-dashboard-skeleton";

/**
 * Loading state of the vocabulary page.
 * @returns The shimmer skeleton in the shape of the page.
 */
export default function Loading() {
  return <FlashcardPageSkeleton />;
}
