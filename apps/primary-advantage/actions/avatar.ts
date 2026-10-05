"use server";

import { db } from "@reading-advantage/db";
import { setAvatarProfile, type AvatarProfile, type SetAvatarProfileInput } from "@reading-advantage/domain/primary-avatar";
import { currentUser } from "@/lib/session";

/** The result of saving the avatar. */
export type AvatarActionState = { success: true; profile: AvatarProfile } | { success: false; error: string };

/**
 * Saves the signed-in user's avatar from the picker (FR-10a).
 * @param input The class and the tints.
 * @returns The saved profile, or the error.
 */
export async function setAvatarProfileAction(input: SetAvatarProfileInput): Promise<AvatarActionState> {
  const user = await currentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    return { success: true, profile: await setAvatarProfile({ db, user, input }) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed" };
  }
}
