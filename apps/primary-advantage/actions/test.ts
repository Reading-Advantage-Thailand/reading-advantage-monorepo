"use server";

import { prisma } from "@/lib/prisma";
import { getArticleById } from "@/server/models/articleModel";
import { generateAudio } from "@/server/utils/genaretors/audio-generator";
import { generateWordLists } from "@/server/utils/genaretors/audio-word-generator";
import { deleteFile, uploadToBucket } from "@/utils/storage";
import { generateImage } from "@/server/utils/genaretors/image-generator";

export async function generateAudios(articleId: string) {
  try {
    const article = await getArticleById(articleId);

    const audio = await generateAudio({
      passage: article.article.passage,
      articleId: articleId,
    });

    return { success: true };
  } catch (error) {
    console.log("error", error);
    return { error: true };
  }
}

export async function generateWordAudios(articleId: string) {
  try {
    // const article = await getArticleById(articleId);

    const audio = await generateWordLists(articleId);

    return { success: true };
  } catch (error) {
    console.log("error", error);
    return { error: true };
  }
}
export async function uploadArticleImages(articleId: string) {
  const result = await uploadToBucket(
    `${process.cwd()}/public/images/${articleId}.png`,
    `images/${articleId}.png`,
  );
  return result;
}

export async function deleteArticleFile(articleId: string) {
  const result = await deleteFile(articleId);
  return result;
}

export async function deleteAllArticles() {
  try {
    // Get all article IDs first (we need them to delete associated files)
    const articles = await prisma.article.findMany({
      select: { id: true },
    });

    if (articles.length === 0) {
      return { success: true, message: "No articles to delete" };
    }

    console.log(
      `Deleting ${articles.length} articles and their associated files...`,
    );

    // Delete all associated files in parallel
    const fileDeletePromises = articles.map((article) =>
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

    console.log(
      `File deletions - Success: ${successfulFileDeletions}, Failed: ${failedFileDeletions}`,
    );

    // Delete all article records in a single operation (much more efficient)
    const deleteResult = await prisma.article.deleteMany({});

    console.log(`Successfully deleted ${deleteResult.count} article records`);

    return {
      success: true,
      deletedCount: deleteResult.count,
      fileDeleteResults: {
        successful: successfulFileDeletions,
        failed: failedFileDeletions,
      },
    };
  } catch (error) {
    console.log("error", error);
    return { error: true };
  }
}

export async function generateImages(articleId: string) {
  try {
    const articles = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, passage: true, imageDescription: true },
    });

    const result = await generateImage({
      imageDesc: articles?.imageDescription as string[],
      articleId: articles?.id as string,
      passage: articles?.passage as string,
    });

    if (result.success) {
      return { success: true, message: "Images generated successfully" };
    } else {
      return { error: true, message: "Failed to generate images" };
    }
  } catch (error) {
    console.log("error", error);
    return { error: true };
  }
}
