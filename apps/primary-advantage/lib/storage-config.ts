/**
 * Storage configuration utilities for Google Cloud Storage
 * Centralizes bucket name and URL construction to avoid hardcoding
 */

export const STORAGE_CONFIG = {
  bucketName:
    process.env.NEXT_PUBLIC_STORAGE_BUCKET_NAME ||
    process.env.STORAGE_BUCKET_NAME ||
    "primary-app-storage",
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

/** The fields of an article that name its pictures in the bucket. */
export type ArticlePictureSource = { id: string; image?: string | null };

/**
 * Returns the key that names an article's pictures in the bucket.
 * The bucket keys pictures by the legacy article id (`images/<cuid>_<n>.png`). Migrated
 * articles carry that id in `image` (cutover spec D10); new articles use their own id.
 * @param article The article with its id and its stored picture key.
 * @returns The picture key: the stored key when present, else the article id.
 */
export function getArticleImageKey(article: ArticlePictureSource): string {
  const key = article.image?.trim();
  // A key is a bare id (legacy cuid or uuid). A URL or a path in the column is not a key.
  return key && /^[\w-]+$/.test(key) ? key : article.id;
}

/**
 * Constructs URLs for article images
 * @param article The article (its id and its stored picture key)
 * @param imageNumber - The image number (1, 2, or 3)
 * @returns Full URL to the article image
 */
export function getArticleImageUrl(
  article: ArticlePictureSource,
  imageNumber: number,
): string {
  return getStorageUrl(`images/${getArticleImageKey(article)}_${imageNumber}.png`);
}

/**
 * Constructs URL for article audio
 * @param audioUrl - The audio URL path (usually starts with '/')
 * @returns Full URL to the audio file
 */
export function getAudioUrl(audioUrl: string): string {
  return getStorageUrl(audioUrl);
}

/** The fields of a story or chapter that name its picture in the bucket. */
export type StoryPictureSource = { id: string; image?: string | null };

/**
 * Returns the key that names a story picture in the bucket (`images/story/<key>.png`).
 * Migrated stories carry the legacy cuid in `image`; new stories use their own id.
 * @param story The story with its id and its stored picture key.
 * @returns The picture key: the stored key when it is a bare id, else the story id.
 */
export function getStoryImageKey(story: StoryPictureSource): string {
  const key = story.image?.trim();
  return key && /^[\w-]+$/.test(key) ? key : story.id;
}

/**
 * Constructs the URL of a story cover.
 * @param story The story (its id and its stored picture key).
 * @returns Full URL to the cover picture.
 */
export function getStoryImageUrl(story: StoryPictureSource): string {
  return getStorageUrl(`images/story/${getStoryImageKey(story)}.png`);
}

/**
 * Returns the key that names a chapter picture in the bucket (`images/story/<key>.png`).
 * @param chapter The chapter with its id and its stored picture key.
 * @returns The picture key: the stored key when it is a bare id, else the chapter id.
 */
export function getChapterImageKey(chapter: StoryPictureSource): string {
  return getStoryImageKey(chapter);
}

/**
 * Constructs the URL of a chapter picture.
 * @param chapter The chapter (its id and its stored picture key).
 * @returns Full URL to the chapter picture.
 */
export function getChapterImageUrl(chapter: StoryPictureSource): string {
  return getStorageUrl(`images/story/${getChapterImageKey(chapter)}.png`);
}
