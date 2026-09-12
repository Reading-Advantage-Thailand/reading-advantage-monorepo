import type { workbooks } from "@reading-advantage/domain";
import { getStorageUrl } from "@reading-advantage/storage";

/**
 * Returns a copy of normalized workbook content in which every article image
 * carrying a canonical storage key but no legacy URL gains the public storage
 * URL for that key. Entries that already carry a legacy URL are untouched
 * (provenance wins over key resolution), entries with neither field are
 * untouched, and blank or whitespace-only keys are not resolved. Resolution is
 * defensive per image: a storage failure on one image leaves that image
 * URL-less exactly as before and never fails the surrounding render.
 * @param content Normalized workbook content to transform.
 * @returns A copy of the content with key-only article images resolved, or the
 * original content when there are no article images to resolve.
 */
export function resolveArticleImageUrls(
  content: workbooks.WorkbookNormalizedContent,
): workbooks.WorkbookNormalizedContent {
  const articleImages = content.articleImages;
  if (articleImages === undefined || articleImages.length === 0) {
    return content;
  }

  const resolved = articleImages.map((image) => {
    if (image.legacyUrl !== undefined) return image;
    if (image.key === undefined || image.key.trim() === "") return image;
    try {
      return { ...image, legacyUrl: getStorageUrl(image.key) };
    } catch {
      return image;
    }
  });

  return { ...content, articleImages: resolved };
}
