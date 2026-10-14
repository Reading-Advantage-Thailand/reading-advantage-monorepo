import {
  getArticlesWithParams,
  getArticleById,
  getQuestionsByArticleId,
  getAllFlashcards,
  deleteFlashcardById,
} from "../models/articleModel";
import { currentUser } from "@/lib/session";

/**
 * Lists the published articles for the Read page, filtered by the query and by the reader's level.
 * @param req The query: title, type, genre, subgenre, cefrLevel, limit, and offset.
 * @returns The page of articles and the total count.
 */
export const fetchArticles = async (req: URLSearchParams) => {
  const title = req.get("title") ?? undefined;
  const type = req.get("type") ?? undefined;
  const genre = req.get("genre") ?? undefined;
  const subgenre = req.get("subgenre") ?? undefined;
  const cefrLevel = req.get("cefrLevel") ?? undefined;
  const limit = parseInt(req.get("limit") || "10", 10);
  const offset = parseInt(req.get("offset") || "0", 10);
  // The reader sees the articles at its level: the level ± 1, the Reading Advantage band.
  // The level comes from the session, never from the query.
  const level = (await currentUser())?.level;
  const raLevelRange = level ? ([level - 1, level + 1] as const) : undefined;

  return getArticlesWithParams({
    title,
    type,
    genre,
    subgenre,
    cefrLevel,
    raLevelRange,
    limit,
    offset,
  });
};

export const fetchArticleById = async (req: URLSearchParams) => {
  const articleId = req.get("articleId") ?? undefined;

  if (!articleId) {
    throw new Error("Article ID is required");
  }

  // Only the signed-in user's activity logs leave the server; without a session there is no log.
  const user = await currentUser();
  return getArticleById(articleId, user?.id);
};


// export const fetchQuestionsByArticleId = async (req: URLSearchParams) => {
//   const articleId = req.get("articleId") ?? undefined;

//   if (!articleId) {
//     throw new Error("Article ID is required");
//   }

//   return getQuestionsByArticleId(articleId);
// };

export const fetchAllFlashcards = async (req: URLSearchParams) => {
  try {
    const userId = await currentUser();

    if (!userId) {
      throw new Error("User not found");
    }

    return getAllFlashcards(userId.id);
  } catch (error) {
    console.error("Error in fetchAllFlashcards:", error);
    throw new Error("Failed to fetch all flashcards");
  }
};

export const deleteFlashcardByIdAction = async (flashcardId: string) => {
  try {
    if (!flashcardId) {
      return { success: false, error: "Flashcard ID is required" };
    }

    await deleteFlashcardById(flashcardId);
    return { success: true, message: "Flashcard deleted successfully" };
  } catch (error) {
    console.error("Error in deleteFlashcardByIdAction:", error);
    return { success: false, error: "Failed to delete flashcard" };
  }
};
