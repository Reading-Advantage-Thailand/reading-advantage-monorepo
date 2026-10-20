"use server";

import { db } from "@reading-advantage/db";
import { setAvatarProfile, type AvatarProfile, type SetAvatarProfileInput } from "@reading-advantage/domain/primary-avatar";
import { currentUser } from "@/lib/session";
import { guardStudentAction, type PreviewActionResult } from "@/lib/student-view";

/** The result of saving the avatar. */
export type AvatarActionState = { success: true; profile: AvatarProfile } | { success: false; error: string };

/**
 * Saves the signed-in user's avatar from the picker (FR-10a).
 * @param input The class and the tints.
 * @returns The saved profile, the error, or the preview result for staff.
 */
export async function setAvatarProfileAction(input: SetAvatarProfileInput): Promise<AvatarActionState | PreviewActionResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const preview = guardStudentAction(user, "set_avatar_profile");
  if (preview) return preview;
  try {
    return { success: true, profile: await setAvatarProfile({ db, user, input }) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}
