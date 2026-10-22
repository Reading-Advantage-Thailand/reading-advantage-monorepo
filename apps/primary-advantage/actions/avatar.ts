"use server";

import { refresh } from "next/cache";
import { db } from "@reading-advantage/db";
import { getAvatarState, setAvatarProfile, type AvatarProfile, type SetAvatarProfileInput } from "@reading-advantage/domain/primary-avatar";
import { currentUser } from "@/lib/session";
import { guardStudentAction, type PreviewActionResult } from "@/lib/student-view";

/** The result of saving the avatar. */
export type AvatarActionState = { success: true; profile: AvatarProfile } | { success: false; error: string };

/**
 * Saves the signed-in user's avatar from the picker (FR-10a). The first-visit grant (the starter set
 * and the welcome GP) runs here, before the client refresh, so the header purse of the shared layout
 * shows the welcome GP at once (PR, 2026-10-21: it showed 0 until a reload).
 * @param input The class and the tints.
 * @returns The saved profile, the error, or the preview result for staff.
 */
export async function setAvatarProfileAction(input: SetAvatarProfileInput): Promise<AvatarActionState | PreviewActionResult> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const preview = guardStudentAction(user, "set_avatar_profile");
  if (preview) return preview;
  try {
    const profile = await setAvatarProfile({ db, user, input });
    await getAvatarState({ db, user });
    refresh();
    return { success: true, profile };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}
