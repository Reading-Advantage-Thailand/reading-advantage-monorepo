import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getAvatarProfile, type AvatarProfile } from "@reading-advantage/domain/primary-avatar";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { AvatarPicker } from "@/components/avatar/avatar-picker";

/** Where the picker may send the student back to. */
const RETURN_TO: Readonly<Record<string, string>> = { reedy: "/student/reedy", me: "/settings/user-profile" };

/**
 * Page title: the avatar picker.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Avatar");
  return { title: t("title") };
}

/**
 * Reads the student's avatar; null when none is saved or the read fails.
 * @param user The signed-in student.
 * @returns The profile, or null.
 */
async function loadProfile(user: NonNullable<Awaited<ReturnType<typeof currentUser>>>): Promise<AvatarProfile | null> {
  try {
    return await getAvatarProfile({ db, user });
  } catch {
    return null;
  }
}

/**
 * The avatar picker page (FR-10a): a hero class, then the colors.
 * @param props.searchParams `from=reedy|me` chooses where the picker returns to.
 * @returns The page.
 */
export default async function AvatarPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });
  const [{ from }, profile, t] = await Promise.all([searchParams, loadProfile(user), getTranslations("Avatar")]);
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </header>
      <AvatarPicker initial={profile} returnTo={RETURN_TO[from ?? ""] ?? "/student/home"} />
    </div>
  );
}
