/**
 * The share moment of the teacher lesson flow (plan task 4.6a, rule D23).
 *
 * The week file holds the share of each lesson day: the shots that the teacher takes at home and
 * the caption for the parents. The module holds the consent line, the label of each kind of
 * media, and the rule that picks the shots of a step.
 *
 * The shot and the share types come from the Zod schemas of the week contract (AGENTS.md: infer
 * types from Zod), so a schema change fails the build here too. The imports are type-only, so
 * the client bundle gains no zod.
 *
 * The app sends nothing. The module holds no file name and no upload path, and a shot names a
 * step of its own day only.
 */

import type { z } from "zod";
import type { shareSchema, shareShotSchema } from "./contracts/week";

/** One shot of a share moment, as the week contract holds it. */
export type ShareShot = z.infer<typeof shareShotSchema>;

/** The share of one lesson day, as the week contract holds it. */
export type ShareMoment = z.infer<typeof shareSchema>;

/** The kind of the media of one shot. */
export type ShareMedia = ShareShot["media"];

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
 * Lists the shots of one step of the day.
 *
 * The rule reads the step id of each shot and the step id of the screen. A shot that names a
 * step of another day names no step here, so it shows nowhere. Every shot that names the step
 * shows, so two shots on one step both render (review finding F408); the schema strictness of
 * distinct steps belongs to Workbooks. The app adds no fallback.
 * @param share The share of the lesson day.
 * @param stepId The id of the step on the screen.
 * @returns The shots that name the step, in the order of the week; empty when no shot names it.
 */
export function shareShotsAt(
  share: ShareMoment | undefined,
  stepId: string | undefined,
): ShareShot[] {
  if (!share || !stepId) return [];
  return share.shots.filter((shot) => shot.step === stepId);
}
