/**
 * The media URL of the client views (design section 4, AC-4.7).
 *
 * Every media file of a week holds a signed URL, so the client views never build a URL of their
 * own. A file that holds no signed URL shows no media.
 */

/**
 * Reads the signed URL of one media file.
 * @param mediaUrls The signed URLs of the week.
 * @param file The file, relative to the Storytime content folder.
 * @returns The signed URL, or an empty string when the file holds no signed URL.
 */
export function mediaUrl(mediaUrls: Record<string, string>, file: string): string {
  return mediaUrls[file] ?? "";
}
