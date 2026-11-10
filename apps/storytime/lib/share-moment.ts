/**
 * The share moment of the teacher lesson flow (plan task 4.6a, rule D23).
 *
 * The week file holds the share of each lesson day: the shots that the teacher takes at home and
 * the caption for the parents. The module holds the consent line, the label of each kind of
 * media, and the rule that picks the shot of a step.
 *
 * The app sends nothing. The module holds no file name and no upload path, and a shot names a
 * step of its own day only.
 */

/** The kind of the media of one shot. */
export type ShareMedia = "photo" | "video";

/** One shot of a share moment. */
export interface ShareShot {
  /** The id of the step of the day. */
  step: string;
  /** The kind of the media of the shot. */
  media: ShareMedia;
}

/** The share of one lesson day. */
export interface ShareMoment {
  /** One or two shots of the day. */
  shots: ShareShot[];
  /** The caption for the parents. */
  caption: { en: string; th: string };
}

/**
 * The consent line that the teacher reads to the parents.
 *
 * The line tells the parents that the photo or the video stays with them. Daniel judges the words
 * at the Phase 6 look check.
 */
export const SHARE_CONSENT_LINE: { en: string; th: string } = {
  en: "Please take a photo or a short video at home and share it with your family. The app sends nothing.",
  th: "กรุณาถ่ายรูปหรือวิดีโอสั้นที่บ้านแล้วแบ่งปันกับครอบครัวของคุณ ทางแอปไม่ส่งอะไรออกไป",
};

/** The label of each kind of media, in English and in Thai. */
export const SHARE_MEDIA_LABELS: Record<ShareMedia, { en: string; th: string }> = {
  photo: { en: "Share a photo", th: "แบ่งปันรูปภาพ" },
  video: { en: "Share a short video", th: "แบ่งปันวิดีโอสั้น" },
};

/**
 * Finds the shot of one step of the day.
 *
 * The rule reads the step id of the shot and the step id of the screen. A shot that names a step
 * of another day names no step here, so it shows nowhere. The app adds no fallback.
 * @param share The share of the lesson day.
 * @param stepId The id of the step on the screen.
 * @returns The shot that names the step, or `null` when no shot names it.
 */
export function shareShotAt(
  share: ShareMoment | undefined,
  stepId: string | undefined,
): ShareShot | null {
  if (!share || !stepId) return null;
  return share.shots.find((shot) => shot.step === stepId) ?? null;
}
