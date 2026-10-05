import { db } from "@reading-advantage/db";
import { listCatalogueBooks, listClassBooks } from "@reading-advantage/domain/primary-books";
import { currentUser } from "@/lib/session";
import EnhancedClassRoster from "@/components/teacher/enhanced-class-roster";
import { ClassBooksCard } from "@/components/teacher/class-books-card";
import { getTeacherQuestCard } from "@reading-advantage/domain/primary-quest";
import { TeacherQuestCard } from "@/components/quest/teacher-quest-card";

/**
 * Reads the books of the class and the catalogue. A failure returns null and the page shows the
 * placeholder slot instead.
 * @param classroomId The class.
 * @returns The class books and the catalogue, or null.
 */
async function loadClassBooks(classroomId: string) {
  const user = await currentUser();
  if (!user) return null;
  try {
    const [books, catalogue] = await Promise.all([listClassBooks({ db, user, classroomId }), listCatalogueBooks({ db, user })]);
    return { books, catalogue };
  } catch {
    return null;
  }
}

/**
 * Reads the class quest card (Class Quest FR-4). A failure returns null: the card shows the assign link.
 * @param classroomId The class.
 * @returns The card, or null.
 */
async function loadQuestCard(classroomId: string) {
  const user = await currentUser();
  if (!user) return null;
  try {
    return await getTeacherQuestCard({ db, user }, classroomId);
  } catch {
    return null;
  }
}

/**
 * Teacher class page: the class heading, the class sign-in card, one student list (live roster
 * with the roster management actions), and the class book card (FR-1).
 * @param props.params The route params with the class id.
 * @returns The class page.
 */
export default async function ClassroomDetailPage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params;
  const [data, quest] = await Promise.all([loadClassBooks(classroomId), loadQuestCard(classroomId)]);
  return (
    <EnhancedClassRoster
      classroomId={classroomId}
      classBook={data ? <ClassBooksCard classroomId={classroomId} books={data.books} catalogue={data.catalogue} /> : undefined}
      classQuest={<TeacherQuestCard classroomId={classroomId} card={quest} />}
    />
  );
}
