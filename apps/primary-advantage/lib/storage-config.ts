/**
 * Storage configuration utilities for Google Cloud Storage
 * Centralizes bucket name and URL construction to avoid hardcoding
 */

export const STORAGE_CONFIG = {
  bucketName: process.env.STORAGE_BUCKET_NAME || "primary-app-storage",
  baseUrl: "https://storage.googleapis.com",
} as const;

/**
 * Constructs a full URL for a file in Google Cloud Storage
 * @param filePath - The path to the file within the bucket (e.g., 'images/article_1.png')
 * @returns Full URL to the file
 */
export function getStorageUrl(filePath: string): string {
  // Remove leading slash if present
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  return `${STORAGE_CONFIG.baseUrl}/${STORAGE_CONFIG.bucketName}/${cleanPath}`;
}

/**
 * Constructs URLs for article images
 * @param articleId - The article ID
 * @param imageNumber - The image number (1, 2, or 3)
 * @returns Full URL to the article image
 */
export function getArticleImageUrl(
  articleId: string,
  imageNumber: number,
): string {
  return getStorageUrl(`images/${articleId}_${imageNumber}.png`);
}

/**
 * Constructs URL for article audio
 * @param audioUrl - The audio URL path (usually starts with '/')
 * @returns Full URL to the audio file
 */
export function getAudioUrl(audioUrl: string): string {
  return getStorageUrl(audioUrl);
}
