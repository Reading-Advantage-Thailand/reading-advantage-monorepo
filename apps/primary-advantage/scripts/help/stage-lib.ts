import { basename } from "node:path";

/**
 * Finds the main mp4 file of a help video in PR's folder listing.
 * @param id The video id, for example `I1`.
 * @param files Paths relative to `assets/videos/primary-whats-new/`, for example `wave3/i1-potion-rush-th.mp4`.
 * @returns The path of `<id>-<name>-th.mp4` (not the `-th-16x9.mp4` variant), or undefined.
 */
export function videoFileFor(id: string, files: readonly string[]): string | undefined {
  const prefix = `${id.toLowerCase()}-`;
  return files.find((file) => basename(file).startsWith(prefix) && file.endsWith("-th.mp4"));
}

/**
 * Tells whether an MP4 file has its `moov` box before its `mdat` box, so a browser can play it
 * before the full download.
 * @param head The first bytes of the file (64 KB is enough for the small boxes before `moov` or `mdat`).
 * @returns True or false, or undefined when the head ends before either box.
 */
export function moovFirst(head: Uint8Array): boolean | undefined {
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  let offset = 0;
  while (offset + 8 <= head.byteLength) {
    const type = String.fromCharCode(...head.subarray(offset + 4, offset + 8));
    if (type === "moov") return true;
    if (type === "mdat") return false;
    let size = view.getUint32(offset);
    if (size === 1 && offset + 16 <= head.byteLength) size = Number(view.getBigUint64(offset + 8));
    if (size < 8) return undefined;
    offset += size;
  }
  return undefined;
}

/**
 * Maps registry ids to their YouTube ids.
 * @param links PR's links JSON (`primary-whats-new-youtube-links.json`).
 * @param ids The registry ids.
 * @returns `{ id: youtubeId }` for each registry id that is on YouTube.
 */
export function youtubeIds(
  links: { videos: readonly { id: string; youtubeId?: string | null }[] },
  ids: readonly string[],
): Record<string, string> {
  return Object.fromEntries(links.videos.filter((v) => v.youtubeId && ids.includes(v.id)).map((v) => [v.id, v.youtubeId as string]));
}
