import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getStudentHome } from "@reading-advantage/domain/primary-home";
import { getStudentClassBooks, type StudentClassBook } from "@reading-advantage/domain/primary-books";
import { getAvatarState } from "@reading-advantage/domain/primary-avatar";
import type { AvatarState } from "@reading-advantage/game-contracts";
import { getVoiceEntitlement, voiceConfigFromEnv } from "@reading-advantage/domain/primary-voice";
import type { ReedyMeterData } from "@/components/reedy/reedy-meter";
import { getDueDateStatus } from "@reading-advantage/domain/assignments/due-date";
import { StatusChip } from "@reading-advantage/ui";
import { AnimatedCounter } from "@reading-advantage/ui/client";
import { currentUser } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { ART } from "@/lib/rpg/places";
import { Scene } from "@/components/rpg/scene";
import { Panel, Plaque, RpgLink } from "@/components/rpg/chrome";
import { AvatarPortrait } from "@/components/avatar/portrait-canvas";
import Leaderboard from "@/components/leaderboard";
import { ReedyMeterSlot } from "@/components/student/reedy-meter-slot";
import { awardPowerUps, getStudentQuestCard } from "@reading-advantage/domain/primary-quest";
import { StudentQuestCard } from "@/components/quest/student-quest-card";
import { AvatarNudge } from "@/components/avatar/avatar-nudge";
import { getSchoolLeaderboardController } from "@/server/controllers/schoolController";

/** The Reedy limits of this process (FR-9). */
const voiceConfig = voiceConfigFromEnv(process.env);

/**
 * Page title for the student home.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("StudentHome");
  return { title: t("title") };
}

type User = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/**
 * Reads the school leaderboard. A failure hides the leaderboard and keeps the rest of the home.
 * @param user The signed-in student.
 * @returns The leaderboard data, or null.
 */
async function loadLeaderboard(user: { id: string; schoolId: string | null }) {
  if (!user.schoolId) return null;
  try {
    const result = await getSchoolLeaderboardController(user.schoolId, user.id);
    return result?.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Reads the class books of the student. A failure hides the cards and keeps the rest of the home.
 * @param user The signed-in student.
 * @returns The class books, or none.
 */
async function loadClassBooks(user: User): Promise<StudentClassBook[]> {
  try {
    return await getStudentClassBooks({ db, user });
  } catch {
    return [];
  }
}

/**
 * The avatar of the student for the hero portrait: the profile and the worn pieces. Null when
 * the student has no avatar yet (the nudge shows) or the read fails (no portrait, no nudge).
 * @param user The signed-in student.
 * @returns The state, "none" without a profile, or null on failure.
 */
async function loadAvatar(user: User): Promise<AvatarState | "none" | null> {
  try {
    const state = await getAvatarState({ db, user });
    return state.profile ? state : "none";
  } catch {
    return null;
  }
}

/**
 * The month's Reedy minutes for the meter (FR-9); null when the read fails.
 * @param user The signed-in student.
 * @returns The meter numbers, or null.
 */
async function loadReedyMeter(user: User): Promise<ReedyMeterData | null> {
  try {
    const { remainingSeconds, budgetSeconds, blockedBy } = await getVoiceEntitlement({ db, user, config: voiceConfig });
    return { remainingSeconds, budgetSeconds, blockedBy };
  } catch {
    return null;
  }
}

/**
 * The week's quest card after the goals are evaluated (Class Quest FR-4, FR-6); null when the
 * student has no quest or the read fails.
 * @param user The signed-in student.
 * @returns The card, or null.
 */
async function loadQuestCard(user: User) {
  try {
    await awardPowerUps({ db, user });
    return await getStudentQuestCard({ db, user });
  } catch {
    return null;
  }
}

/**
 * Student home (FR-4) in the guild hall (docs/primary-rpg-skin.md §4): the hero at the quest
 * board with the stats on a plaque; the Class Quest banner; today's lesson, the class books, and
 * the story in progress as pinned notices; the arena door; the campfire (Reedy); the hall of fame.
 * @returns The home page.
 */
export default async function StudentHomePage() {
  const user = await currentUser();
  if (!user) return redirect({ href: "/auth/signin", locale: await getLocale() });

  const [home, classBooks, leaderboard, avatar, reedy, quest, t, tBoard, tAvatar, tReedy, format] = await Promise.all([
    getStudentHome({ db, user }),
    loadClassBooks(user),
    loadLeaderboard(user),
    loadAvatar(user),
    loadReedyMeter(user),
    loadQuestCard(user),
    getTranslations("StudentHome"),
    getTranslations("Leaderboard"),
    getTranslations("Avatar"),
    getTranslations("Reedy"),
    getFormatter(),
  ]);
  const lesson = home.todayLesson;
  const reading = home.continueReading;
  // Calendar days in Bangkok: the lesson is late only after its due day.
  const overdue = getDueDateStatus(lesson?.dueDate).kind === "overdue";
  const profile = avatar && avatar !== "none" ? avatar.profile : null;

  return (
    <Scene place="guild-hall">
      <header className="flex flex-col gap-1">
        <h1 className="cq-on-scene text-2xl font-bold md:text-3xl">{t("greeting", { name: user.name ?? user.username })}</h1>
        <p className="cq-on-scene text-sm opacity-90">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-[112px_1fr] items-end gap-3">
        {profile ? (
          <AvatarPortrait classId={profile.classId} pieces={Object.values(avatar !== "none" && avatar ? avatar.loadout : {})} tints={profile.tints} alt={t("yourHero")} className="cq-shadowed cq-bob w-28" />
        ) : (
          <img src={ART.banner} alt="" className="cq-shadowed w-24 justify-self-center" />
        )}
        <section aria-label={t("progress")} className="grid grid-cols-3 gap-2">
          <Plaque icon={ART.campfire} label={t("streak")}>
            {t("streakValue", { count: home.streakDays })}
          </Plaque>
          <Plaque icon={ART.gem} label={t("xp")}>
            <AnimatedCounter value={home.xp} />
          </Plaque>
          <Plaque icon={ART.shield} label={t("level")}>
            {home.level}
          </Plaque>
        </section>
      </div>

      {avatar === "none" ? <AvatarNudge t={tAvatar} /> : null}

      <StudentQuestCard card={quest} />

      <div className="grid gap-4 md:grid-cols-2">
        {lesson ? (
          <Panel pinned aria-labelledby="home-lesson" className="md:col-span-2">
            <h2 id="home-lesson" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
              <img src={ART.scroll} alt="" className="size-7" />
              {t("todayLesson")}
            </h2>
            <p className="text-xl font-bold">{lesson.title}</p>
            <div className="cq-muted flex flex-wrap items-center gap-2 text-sm">
              <span>{lesson.dueDate ? t("dueDate", { date: format.dateTime(lesson.dueDate, { day: "numeric", month: "short" }) }) : t("noDueDate")}</span>
              {overdue ? <StatusChip tone="danger">{t("overdue")}</StatusChip> : null}
            </div>
            <RpgLink tone="gold" href={`/student/lesson/${lesson.assignmentId}`} className="mt-1 self-start">
              {lesson.started ? t("continueLesson") : t("startLesson")}
            </RpgLink>
          </Panel>
        ) : null}

        {classBooks.map((book) => (
          <ClassBookCard key={book.classBookId} book={book} t={t} />
        ))}

        <Panel pinned aria-labelledby="home-reading">
          <h2 id="home-reading" className="flex items-center gap-2 text-lg font-semibold">
            <img src={ART.scroll} alt="" className="size-7" />
            {t("continueReading")}
          </h2>
          {reading ? (
            <>
              <p className="font-article text-xl font-bold">{reading.title}</p>
              {reading.cefrLevel ? <StatusChip tone="success">{reading.cefrLevel}</StatusChip> : null}
              <RpgLink href={`/student/read/${reading.articleId}`} className="mt-auto self-start">
                {t("keepReading")}
              </RpgLink>
            </>
          ) : (
            <>
              <p className="font-bold">{t("noReading")}</p>
              <p className="cq-muted text-sm">{t("noReadingHint")}</p>
              <RpgLink href="/student/read" className="mt-auto self-start">
                {t("findStory")}
              </RpgLink>
            </>
          )}
        </Panel>

        <Panel aria-labelledby="home-games" className="grid grid-cols-[64px_1fr] items-center gap-3">
          <img src={ART.chest} alt="" className="cq-shadowed w-16" />
          <div className="flex flex-col gap-2">
            <h2 id="home-games" className="text-lg font-semibold">
              {t("arena")}
            </h2>
            <p className="cq-muted text-sm">{t("arenaHint")}</p>
            <RpgLink tone="iron" href="/student/games" className="self-start">
              {t("playGames")}
            </RpgLink>
          </div>
        </Panel>

        <ReedyMeterSlot data={reedy} t={tReedy} />
      </div>

      {leaderboard ? (
        <Panel aria-label={tBoard("title")} className="overflow-x-auto">
          <Leaderboard data={leaderboard.results ?? []} schoolName={leaderboard.schoolName ?? ""} userId={user.id} />
        </Panel>
      ) : null}
    </Scene>
  );
}

/**
 * The class book card (FR-4): the book, the current lesson, and the read link when the teacher
 * has opened the reading step (or the class reads independently).
 * @param props.book The class book of the student.
 * @param props.t The StudentHome translator.
 * @returns The card.
 */
function ClassBookCard({ book, t }: { book: StudentClassBook; t: Awaited<ReturnType<typeof getTranslations<"StudentHome">>> }) {
  const headingId = `home-book-${book.classBookId}`;
  const lesson = book.lesson;
  const canRead = lesson?.articleId && lesson.unlockedAppSteps.includes(3);
  return (
    <Panel pinned aria-labelledby={headingId}>
      <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold">
        <img src={ART.noticeBoard} alt="" className="size-7" />
        {t("classBook")}
      </h2>
      <p className="font-semibold">{book.bookName}</p>
      {lesson ? (
        <>
          <p className="font-article text-xl font-bold">{t("classBookLesson", { number: lesson.number, title: lesson.title })}</p>
          {canRead ? (
            <RpgLink tone="gold" href={`/student/lesson/${lesson.articleId}?type=article`} className="self-start">
              {t("readLesson")}
            </RpgLink>
          ) : (
            <p className="cq-muted text-sm">{t("classBookLocked")}</p>
          )}
        </>
      ) : (
        <p className="cq-muted text-sm">{t("classBookNoLesson")}</p>
      )}
      <RpgLink tone="iron" href={`/student/books/${book.classBookId}`} className="mt-auto self-start">
        {t("seeBook")}
      </RpgLink>
    </Panel>
  );
}
