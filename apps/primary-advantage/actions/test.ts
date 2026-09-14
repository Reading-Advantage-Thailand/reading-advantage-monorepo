"use server";

import {
  db,
  eq,
} from '@reading-advantage/db';
import { articles } from '@reading-advantage/db';
import { getArticleById } from "@/server/models/articleModel";
import { generateAudio } from "@/server/utils/generators/audio-generator";
import { generateWordLists } from "@/server/utils/generators/audio-word-generator";
import { deleteFile, uploadToBucket } from "@/utils/storage";
import { generateImage } from "@/server/utils/generators/image-generator";
import { currentUser } from "@/lib/session";
import { canRunContentTooling } from "@/lib/authorization";

/**
 * Rejects callers without bulk content-tooling rights.
 * @returns An error result, or null when the caller may proceed.
 */
async function requireToolingAccess(): Promise<{ success: false; error: string } | null> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  if (!canRunContentTooling(user)) return { success: false, error: "Forbidden" };
  return null;
}

/**
 * Generates passage and sentence audio for an article.
 * @param articleId The source article identifier.
 * @returns The generation result.
 */
export async function generateAudios(articleId: string) {
  const denied = await requireToolingAccess();
  if (denied) return denied;
  try {
    const article = await getArticleById(articleId);
    const passage = article.article.passage;
    if (!passage) throw new Error("Article passage is required");

    await generateAudio({
      passage,
      sentences: [],
      articleId,
    });

    return { success: true };
  } catch (error) {
    return { error: true };
  }
}

/**
 * Generates word-list audio for an article.
 * @param articleId The source article identifier.
 * @returns The generation result.
 */
export async function generateWordAudios(articleId: string) {
  const denied = await requireToolingAccess();
  if (denied) return denied;
  try {
    // const article = await getArticleById(articleId);

    const audio = await generateWordLists(articleId);

    return { success: true };
  } catch (error) {
    return { error: true };
  }
}
/**
 * Uploads the generated image for an article to storage.
 * @param articleId The source article identifier.
 * @returns The upload result.
 */
export async function uploadArticleImages(articleId: string) {
  const denied = await requireToolingAccess();
  if (denied) return denied;
  const result = await uploadToBucket(
    `${process.cwd()}/public/images/${articleId}.png`,
    `images/${articleId}.png`,
  );
  return result;
}

/**
 * Deletes the stored file for an article.
 * @param articleId The source article identifier.
 * @returns The deletion result.
 */
export async function deleteArticleFile(articleId: string) {
  const denied = await requireToolingAccess();
  if (denied) return denied;
  const result = await deleteFile(articleId);
  return result;
}

/**
 * Deletes every article row and its stored files.
 * @returns The deletion summary.
 */
export async function deleteAllArticles() {
  const denied = await requireToolingAccess();
  if (denied) return denied;
  try {
    // Get all article IDs first (we need them to delete associated files)
    const articleRows = await db.select({ id: articles.id }).from(articles);

    if (articleRows.length === 0) {
      return { success: true, message: "No articles to delete" };
    }


    // Delete all associated files in parallel
    const fileDeletePromises = articleRows.map((article) =>
      deleteFile(article.id),
    );
    const fileResults = await Promise.allSettled(fileDeletePromises);

    // Log file deletion results
    const successfulFileDeletions = fileResults.filter(
      (result) => result.status === "fulfilled",
    ).length;
    const failedFileDeletions = fileResults.filter(
      (result) => result.status === "rejected",
    ).length;


    // Delete all article records (replaces Prisma deleteMany). Returning rows
    // gives us the deleted count.
    const deletedRows = await db.delete(articles).returning({ id: articles.id });


    return {
      success: true,
      deletedCount: deletedRows.length,
      fileDeleteResults: {
        successful: successfulFileDeletions,
        failed: failedFileDeletions,
      },
    };
  } catch (error) {
    return { error: true };
  }
}

/**
 * Generates and stores the image for an article.
 * @param articleId The source article identifier.
 * @returns The generation result.
 */
export async function generateImages(articleId: string) {
  const denied = await requireToolingAccess();
  if (denied) return denied;
  try {
    const [article] = await db.select({
      id: articles.id,
      passage: articles.passage,
      imageDescription: articles.imageDescription,
    })
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (!article?.imageDescription || !article.passage) {
      throw new Error("Article image fields are required");
    }
    const result = await generateImage({
      imageDesc: article.imageDescription,
      articleId: article.id,
      passage: article.passage,
    });

    if (result.success) {
      return { success: true, message: "Images generated successfully" };
    } else {
      return { error: true, message: "Failed to generate images" };
    }
  } catch (error) {
    return { error: true };
  }
}
