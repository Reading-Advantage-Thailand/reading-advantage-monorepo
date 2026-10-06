import { getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { gpBalance } from "@reading-advantage/domain/primary-avatar";
import { Coins, Gem } from "./chrome";

/**
 * The header HUD of a student: the coin purse (GP) and the XP gem. A failed GP read hides the
 * purse and keeps the gem.
 * @param props.user The signed-in student.
 * @returns The two chips.
 */
export async function StudentHud({ user }: { user: { id: string; schoolId?: string | null; xp?: number | null } }) {
  const t = await getTranslations("AppShell");
  let gp: number | null = null;
  if (user.schoolId) {
    try {
      gp = await gpBalance(db, user.schoolId, user.id);
    } catch {
      gp = null;
    }
  }
  return (
    <div className="flex items-center gap-2" data-student-hud>
      {gp !== null ? <Coins gp={gp} label={t("gp", { gp })} /> : null}
      <Gem xp={user.xp ?? 0} label={t("xp", { xp: user.xp ?? 0 })} className="hidden sm:inline-flex" />
    </div>
  );
}
