import { db } from "@reading-advantage/db";
import { createTenantDB } from "@reading-advantage/domain";
import { getChapterQuestions } from "@reading-advantage/domain/stories";
import { currentUser } from "@/lib/session";
import { ChapterQuiz } from "./chapter-quiz";

/**
 * The question section of a story chapter: loads the saved quiz (5 random MCQ without
 * answers, one SAQ, one LAQ, and what the student finished) and hands it to the
 * interactive quiz panels. A failed load renders nothing; the chapter still reads.
 * @param props.chapterId The chapter id.
 * @param props.userLevel The student reading level (sets the LAQ length rule).
 * @returns The quiz panels, or nothing when the quiz fails to load.
 */
export async function ChapterQuestions({ chapterId, userLevel }: { chapterId: string; userLevel: number }) {
  const user = await currentUser();
  if (!user) return null;
  const tenant = { schoolId: user.schoolId };
  let quiz;
  try {
    quiz = await getChapterQuestions({ db: createTenantDB(db, tenant), user, tenant, input: { chapterId } });
  } catch {
    return null;
  }
  return <ChapterQuiz chapterId={chapterId} userLevel={userLevel} initial={quiz} />;
}
