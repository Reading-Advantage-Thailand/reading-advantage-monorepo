import { db } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { QUEST_TEMPLATES, assignClassQuest, awardPowerUps, cancelClassQuest, getStudentQuestCard, getTeacherQuestCard, type AssignClassQuestInput } from "@reading-advantage/domain/primary-quest";
import { apkChallengeDependencies } from "@/lib/apk/challenge-dependencies";

/** Assigns a quest template to a class for the week (FR-2). */
export const assignQuest = (user: UserContext, input: AssignClassQuestInput) => assignClassQuest({ db, user }, input, apkChallengeDependencies.resolveGameCapability);

/** Cancels an open quest before the battle (FR-2). */
export const cancelQuest = (user: UserContext, questId: string) => cancelClassQuest({ db, user }, questId);

/** The teacher's quest card of one class (FR-4). */
export const teacherQuestCard = (user: UserContext, classroomId: string) => getTeacherQuestCard({ db, user }, classroomId);

/** The student's quest card after the week's goals are evaluated (FR-4, FR-6). */
export async function studentQuestCard(user: UserContext) {
  await awardPowerUps({ db, user });
  return getStudentQuestCard({ db, user });
}

/** The fixed template list for the assign page (FR-1). */
export const questTemplates = () => QUEST_TEMPLATES;
