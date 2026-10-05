import { AssignmentListSkeleton } from "@/components/student/assignment-list-skeleton";

/**
 * Loading state of the student assignments page.
 * @returns The shimmer skeleton in the shape of the page.
 */
export default function Loading() {
  return <AssignmentListSkeleton />;
}
