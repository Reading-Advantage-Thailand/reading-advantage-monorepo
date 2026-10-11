/**
 * The Primary Advantage cutover ETL (spec `docs/deployment/primary-cutover-migration-spec.md`
 * §6, task A6; track primary_legacy_data_migration_20261004, FR-3).
 *
 * Reads the legacy Prisma database (read only) and writes the shared-schema database, one
 * transaction per table group, in the §6 order. Every remapped key goes through
 * `primary_legacy_id_map` (`table_name` = the legacy table name, `legacy_id` = the Prisma cuid,
 * `new_id` = the new uuid), so a rerun updates the rows it wrote before instead of duplicating
 * them. The run ends with a reconciliation report: rows read, written, skipped with a reason, per
 * table, plus the tables that are dropped or deferred, each with its reason.
 *
 * Pure row transforms are exported for tests; `runPrimaryLegacyImport` does the database work.
 */
import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { generateStudentUsername, isStudentUsername } from "../student-usernames.js";

type Sql = postgres.Sql;
type Tx = postgres.TransactionSql;
type Row = Record<string, unknown>;

/** A value bound for a jsonb column: upsert sends it through `sql.json`, so an array or an object lands as JSON, never as a string or a Postgres array. */
export class JsonCell {
  constructor(readonly value: unknown) {}
}

/** Wraps a legacy json value for a jsonb column; null stays null. */
export const jsonb = (value: unknown): JsonCell | null => (value === null || value === undefined ? null : new JsonCell(value));

/** The `primary_legacy_id_map.table_name` values the ETL writes (legacy table names). */
export const MAP_TABLES = {
  schools: "schools",
  licenses: "licenses",
  classrooms: "classrooms",
  classroomStudents: "classroom_students",
  classroomTeachers: "classroom_teachers",
  schoolAdmins: "school_admins",
  article: "article",
  mcq: "multiple_choice_questions",
  saq: "short_answer_questions",
  laq: "long_answer_questions",
  flashcard: "sentencs_and_words_for_flashcard",
  articleActivityLogs: "article_activity_logs",
  assignments: "assignments",
  assignmentStudents: "assignment_students",
  userLessonProgress: "user_lesson_progress",
  userActivities: "user_activities",
  xpLogs: "xp_logs",
  flashcardDecks: "flashcard_decks",
  flashcardCards: "flashcard_cards",
  cardReviews: "card_reviews",
} as const;

/**
 * Owner-approved answer fixes (2026-10-07) for the legacy MCQs whose answer text is not one of
 * their options: each id maps to the option text that is the answer.
 */
export const MCQ_ANSWER_FIXES: Readonly<Record<string, string>> = {
  cmgqtfb1400jot79b2b8vt3wx: "It rolled under her bed.",
  cmorc24e10021s6012hxz5jhi: "It was better and lighter",
  cmou6yrgv0049s601qg1b3hx5: "When water covers dry land",
  cmqqrw1h1000us6011cslsbeh: "They talk.",
};

/** Legacy tables the ETL does not load, each with its reason (spec §6, inventory §2-3). */
export const DROPPED_TABLES: ReadonlyArray<{ table: string; reason: string }> = [
  { table: "sessions", reason: "spec §6: everyone signs in again" },
  { table: "verifications", reason: "spec §6: not moved; 0 rows in April" },
  { table: "logs", reason: "operational service logs, no user data" },
  { table: "roles", reason: "the shared schema keeps the role on users.role (D9)" },
  { table: "_UserActivityToXPLogs", reason: "no link table in the shared schema; xp_logs.activity_id keeps the link" },
  { table: "validation_runs", reason: "cron validator state" },
  { table: "contact_messages", reason: "no target; export for the sales team is an owner decision" },
  { table: "ai_providers", reason: "AI configuration comes from the environment" },
  { table: "ai_task_configs", reason: "AI configuration comes from the environment" },
  { table: "leaderboards", reason: "snapshot data; the app recomputes it" },
  { table: "game_rankings", reason: "legacy table in the target; the play kit keeps its own ledger" },
  { table: "ai_insights", reason: "JSON title and description have no text target (inventory R6); deferred" },
  { table: "stories, story_chapters", reason: "deferred: the new app has no stories page (docs/primary-whats-moved.md); chapter questions and flashcard rows go with them" },
  { table: "cloze_test_games", reason: "0 rows in the 2026-10-07 copy; the target keeps no game state" },
  { table: "learning_goals, goal_milestones, goal_progress_logs, assignment_notifications", reason: "0 rows in April; loaded by a later run if production has rows" },
];

/** One table's reconciliation counts. */
export interface TableReport {
  read: number;
  written: number;
  skipped: Record<string, number>;
  /** Up to 20 example legacy ids per skip reason. */
  examples: Record<string, string[]>;
}

/** The whole run's report. */
export interface ImportReport {
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  tables: Record<string, TableReport>;
  dropped: ReadonlyArray<{ table: string; reason: string }>;
  notes: string[];
}

/** Options of a run. */
export interface ImportOptions {
  legacy: Sql;
  target: Sql;
  /** Roll everything back at the end (every group still runs inside its transaction). */
  dryRun?: boolean;
  /** Owner assignments for legacy users whose role is not student/teacher/admin/system (D9); null: the user is not moved. */
  roleOverrides?: Record<string, TargetRole | null>;
  /** Owner-chosen usernames (legacy user id → username) in place of `lower(email)`. */
  usernameOverrides?: Record<string, string>;
  /** Owner assignments of a teacher (legacy user id) for legacy classrooms with no teacher and no school admin. */
  classroomTeacherOverrides?: Record<string, string>;
  log?: (line: string) => void;
}

export type TargetRole = "STUDENT" | "TEACHER" | "ADMIN" | "SYSTEM";

const ROLE_MAP: Record<string, TargetRole> = { student: "STUDENT", teacher: "TEACHER", admin: "ADMIN", system: "SYSTEM" };

/** Maps a legacy role text to the target enum; null when the owner must assign it (D9). */
export function mapRole(role: unknown, overrides: Record<string, TargetRole | null> | undefined, legacyUserId: string): TargetRole | null {
  const fromOverride = overrides?.[legacyUserId];
  if (fromOverride) return fromOverride;
  return ROLE_MAP[String(role ?? "").toLowerCase()] ?? null;
}

/** The username rule (D6): `lower(email)`, or the owner-chosen username; the display username keeps the text as typed. */
export function usernamesOf(email: string, override?: string): { username: string; displayUsername: string } {
  if (override?.trim()) return { username: override.trim().toLowerCase(), displayUsername: override.trim() };
  return { username: email.trim().toLowerCase(), displayUsername: email.trim() };
}

/**
 * Builds the target `users` row of one legacy user. A student keeps no email: the legacy one only
 * existed because the old system required it (owner decision 2026-10-08).
 * @param u The legacy users row.
 * @param role The target role.
 * @param names The username and display username (empty for a student until `assignStudentUsernames`).
 * @param schoolId The new school id, or null.
 * @returns The row for the upsert.
 */
export function targetUserRow(u: Row, role: TargetRole, names: { username: string; displayUsername: string }, schoolId: string | null): Row {
  const student = role === "STUDENT";
  return {
    id: String(u.id), username: names.username, display_username: names.displayUsername, name: u.name,
    email: student ? null : u.email, image: u.image, role, school_id: schoolId, xp: u.xp ?? 0, level: u.level ?? 1,
    cefr_level: u.cefrLevel ?? "A1-", password: u.password, email_verified: !student && u.email_verified ? u.createdAt : null,
    created_at: u.createdAt, updated_at: u.updatedAt,
  };
}

/**
 * Gives each migrated student a permanent username of two words and two digits (owner decision
 * 2026-10-08: no email, no class or grade part). A student whose target row already has such a
 * username keeps it, so a rerun renames no one.
 * @param studentIds The ids of the migrated students.
 * @param existing The username of each user already in the target (user id to username).
 * @param taken The usernames of all other users. The function adds each name it gives.
 * @param pick Returns a random integer below the given bound. Tests replace it.
 * @returns The username of each student (user id to username).
 * @throws When 50 tries in a row find no free username for one student.
 */
export function assignStudentUsernames(
  studentIds: string[],
  existing: Map<string, string>,
  taken: Set<string>,
  pick?: (max: number) => number,
): Map<string, string> {
  const names = new Map<string, string>();
  for (const id of studentIds) {
    const kept = existing.get(id);
    if (kept && isStudentUsername(kept)) { names.set(id, kept); taken.add(kept); }
  }
  for (const id of studentIds) {
    if (names.has(id)) continue;
    let name = generateStudentUsername(pick);
    for (let tries = 1; taken.has(name); tries++) {
      if (tries >= 50) throw new Error("No free student username after 50 tries.");
      name = generateStudentUsername(pick);
    }
    taken.add(name);
    names.set(id, name);
  }
  return names;
}

/** Parses a legacy classroom grade text into an integer, or null when it is not a number. */
export function parseGrade(grade: unknown): number | null {
  if (grade === null || grade === undefined) return null;
  const n = Number.parseInt(String(grade).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Reads a Postgres `timestamp` text as UTC. Prisma writes UTC into the legacy `timestamp(3)` columns;
 * the postgres.js default reads them in the process time zone and moves every date on a non-UTC machine.
 * @param text The timestamp text, for example `2025-12-01 08:52:42.431`.
 * @returns The instant in UTC.
 */
export function parseUtcTimestamp(text: string): Date {
  return new Date(`${text.replace(" ", "T")}Z`);
}

/**
 * The 0-based order of a legacy question inside its article. The legacy tables have no order column, and
 * all the questions of an article share one `createdAt`, so the cuid id (it grows in insert order) breaks the tie.
 */
export const QUESTION_ORDER_SQL = 'row_number() over (partition by article_id order by "createdAt", id) - 1';

/** postgres.js `types` for the legacy connection: `timestamp` (oid 1114) values are read as UTC. */
export const LEGACY_UTC_TIMESTAMP = {
  legacyTimestamp: {
    to: 1114,
    from: [1114],
    serialize: (x: Date | string) => (x instanceof Date ? x : new Date(x)).toISOString(),
    parse: parseUtcTimestamp,
  },
};

/** The index of the legacy MCQ answer inside its options, or -1 (exact first, then trimmed, case-insensitive). */
export function correctAnswerIndex(options: ReadonlyArray<string>, answer: string | null): number {
  if (answer === null || answer === undefined) return -1;
  const exact = options.indexOf(answer);
  if (exact >= 0) return exact;
  const norm = (s: string) => s.trim().toLowerCase();
  return options.findIndex((o) => norm(o) === norm(answer));
}

/** Keeps the row with the latest `updatedAt` per key (legacy duplicates the target forbids). */
export function keepLatest<T extends Row>(rows: ReadonlyArray<T>, keyOf: (row: T) => string, updatedAt: (row: T) => Date | string | null): { kept: T[]; dropped: T[] } {
  const best = new Map<string, T>();
  const dropped: T[] = [];
  const time = (row: T) => { const v = updatedAt(row); return v ? new Date(v).getTime() : 0; };
  for (const row of rows) {
    const key = keyOf(row);
    const current = best.get(key);
    if (!current) { best.set(key, row); continue; }
    if (time(row) > time(current)) { dropped.push(current); best.set(key, row); } else dropped.push(row);
  }
  return { kept: [...best.values()], dropped };
}

/** The legacy article row shape the ETL reads. */
export interface LegacyArticle {
  id: string; type: string | null; genre: string | null; sub_genre: string | null; title: string; summary: string | null;
  passage: string | null; image_description: string | null; cefr_level: string | null; ra_level: number | null; rating: number | null;
  audio_url: string | null; audio_word_url: string | null; sentences: unknown; words: unknown; author_id: string | null;
  created_at: Date; updated_at: Date; translated_passage: unknown; translated_summary: unknown; brainstorming: string | null;
  is_approved: boolean | null; is_draft: boolean | null; is_published: boolean | null; planning: string | null; topic: string | null;
}

/** Maps a legacy article to the target row (D10: the picture key is the legacy id; both publish flags follow is_published). */
export function mapArticle(a: LegacyArticle, newId: string, authorExists: boolean): Row {
  return {
    id: newId,
    title: a.title,
    content: a.passage ?? "",
    summary: a.summary,
    level: a.ra_level,
    cefr_level: a.cefr_level,
    topic: a.topic,
    image: a.id,
    published: a.is_published ?? false,
    type: a.type,
    genre: a.genre,
    sub_genre: a.sub_genre,
    passage: a.passage,
    translated_summary: jsonb(a.translated_summary),
    translated_passage: jsonb(a.translated_passage),
    image_description: a.image_description,
    ra_level: a.ra_level,
    rating: a.rating,
    audio_url: a.audio_url,
    audio_word_url: a.audio_word_url,
    sentences: jsonb(a.sentences),
    words: jsonb(a.words),
    author_id: authorExists ? a.author_id : null,
    is_public: false,
    is_approved: a.is_approved ?? false,
    is_draft: a.is_draft ?? false,
    is_published: a.is_published ?? false,
    brainstorming: a.brainstorming,
    planning: a.planning,
    created_at: a.created_at,
    updated_at: a.updated_at,
  };
}

/**
 * Maps a legacy classroom to the target row. Migrated classes start with the picture password off
 * (owner decision 2026-10-08): students sign in with the class code and their name, as before.
 * @param c The legacy classroom row.
 * @param target The new id, the school id, the teacher id, and the parsed grade.
 * @returns The target classroom row.
 */
export function mapClassroom(c: Row, target: { id: string; schoolId: string | null | undefined; teacherId: string; grade: number | null }): Row {
  return {
    id: target.id, name: c.name, school_id: target.schoolId, teacher_id: target.teacherId, class_code: c.classCode, code_expires_at: c.codeExpiresAt,
    grade: target.grade, password_students: c.password_students, picture_password_enabled: false, created_at: c.createdAt, updated_at: c.updatedAt,
  };
}

/** Maps a legacy assignment-student status to the target text and flag. */
export function mapAssignmentStatus(status: unknown): { status: string; completed: boolean } {
  const s = String(status ?? "NOT_STARTED");
  return { status: s, completed: s === "COMPLETED" };
}

/** Maps legacy lesson progress to the target status text. */
/** The card text the Primary reader writes to `flashcard_cards.front` and `back`: the word of a vocabulary card, the sentence of a sentence card. */
export function cardTextOf(card: { type?: unknown; word?: unknown; sentence?: unknown }): string | null {
  const text = String(card.type) === "VOCABULARY" ? card.word : card.sentence;
  return typeof text === "string" && text.trim() ? text : null;
}

/** The review counts of `flashcard_progress`: Good (3) and Easy (4) are correct, Again (1) and Hard (2) are not, as the Primary review action counts them. */
export function reviewCountsOf(ratings: ReadonlyArray<number>): { correct: number; incorrect: number } {
  const correct = ratings.filter((r) => r >= 3).length;
  return { correct, incorrect: ratings.length - correct };
}

export function lessonStatusOf(isCompleted: boolean | null, progress: number | null): string {
  if (isCompleted) return "completed";
  return (progress ?? 0) > 0 ? "in_progress" : "not_started";
}

class IdMap {
  private readonly known = new Map<string, string>();
  private readonly pending: Array<{ table: string; legacyId: string; newId: string }> = [];
  constructor(rows: ReadonlyArray<{ table_name: string; legacy_id: string; new_id: string }>) {
    for (const r of rows) this.known.set(`${r.table_name}\u0000${r.legacy_id}`, r.new_id);
  }
  get(table: string, legacyId: string | null | undefined): string | null {
    if (!legacyId) return null;
    return this.known.get(`${table}\u0000${legacyId}`) ?? null;
  }
  ensure(table: string, legacyId: string): string {
    const key = `${table}\u0000${legacyId}`;
    const existing = this.known.get(key);
    if (existing) return existing;
    const newId = randomUUID();
    this.known.set(key, newId);
    this.pending.push({ table, legacyId, newId });
    return newId;
  }
  async flush(tx: Tx): Promise<void> {
    while (this.pending.length) {
      const batch = this.pending.splice(0, 500).map((p) => ({ table_name: p.table, legacy_id: p.legacyId, new_id: p.newId }));
      await tx`insert into primary_legacy_id_map ${tx(batch)} on conflict do nothing`;
    }
  }
}

class Counter {
  readonly tables: Record<string, TableReport> = {};
  table(name: string): TableReport {
    return (this.tables[name] ??= { read: 0, written: 0, skipped: {}, examples: {} });
  }
  skip(name: string, reason: string, legacyId: string): void {
    const t = this.table(name);
    t.skipped[reason] = (t.skipped[reason] ?? 0) + 1;
    (t.examples[reason] ??= []);
    if (t.examples[reason].length < 20) t.examples[reason].push(legacyId);
  }
}

async function upsert(tx: Tx, table: string, rows: Row[], conflict = "id"): Promise<number> {
  if (!rows.length) return 0;
  const columns = Object.keys(rows[0]!);
  const updates = columns.filter((c) => c !== conflict);
  let written = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v instanceof JsonCell ? tx.json(v.value as never) : v])));
    await tx`insert into ${tx(table)} ${tx(batch, ...columns)} on conflict (${tx(conflict)}) do update set ${tx.unsafe(updates.map((c) => `"${c}" = excluded."${c}"`).join(", "))}`;
    written += batch.length;
  }
  return written;
}

/** Runs the whole import and returns the report. */
export async function runPrimaryLegacyImport(options: ImportOptions): Promise<ImportReport> {
  const { legacy, target, dryRun = false, roleOverrides, usernameOverrides = {}, classroomTeacherOverrides = {}, log = () => {} } = options;
  const startedAt = new Date().toISOString();
  const counter = new Counter();
  const notes: string[] = [];
  const existingMap = await target<{ table_name: string; legacy_id: string; new_id: string }[]>`select table_name, legacy_id, new_id from primary_legacy_id_map`;
  const ids = new IdMap(existingMap);
  log(`id map: ${existingMap.length} rows known`);

  // The users that exist after group 1; later groups need them for foreign keys.
  const users = new Set<string>();

  // A normal run commits one transaction per group. A dry run holds one outer transaction, runs
  // each group in a savepoint so that later groups see the earlier rows, and rolls back at the end.
  let open: (body: (tx: Tx) => Promise<void>) => Promise<unknown> = (body) => target.begin(body);
  const group = async (name: string, body: (tx: Tx) => Promise<void>) => {
    log(`group ${name}`);
    await open(async (tx) => { await body(tx); await ids.flush(tx); });
  };
  const migratedArticles = new Set<string>();
  // The teacher of each migrated classroom (legacy classroom id → user id), for assignments whose own teacher is gone.
  const classTeachers = new Map<string, string>();

  const main = async () => {
  // ── 1. schools, users, accounts, school admins ───────────────────────────────────
  await group("identity", async (tx) => {
    const schools = await legacy<Row[]>`select id, name, contact_name, contact_email, owner_id, "createdAt", "updatedAt" from schools`;
    counter.table("schools").read = schools.length;
    counter.table("schools").written += await upsert(tx, "schools", schools.map((s) => ({
      id: ids.ensure(MAP_TABLES.schools, String(s.id)), name: s.name, contact_name: s.contact_name, contact_email: s.contact_email,
      owner_id: s.owner_id, created_at: s.createdAt, updated_at: s.updatedAt,
    })));

    const legacyUsers = await legacy<Row[]>`select id, name, email, image, "createdAt", "updatedAt", password, "cefrLevel", level, xp, school_id, email_verified, role from users order by "createdAt"`;
    counter.table("users").read = legacyUsers.length;
    const seenUsernames = new Set<string>();
    const userRows: Row[] = [];
    for (const u of legacyUsers) {
      const id = String(u.id);
      if (roleOverrides?.[id] === null) { counter.skip("users", "not moved (owner decision)", id); continue; }
      const role = mapRole(u.role, roleOverrides, id);
      if (!role) { counter.skip("users", `role '${String(u.role)}' needs an owner assignment (D9)`, id); continue; }
      // Students get a two-word username after this loop; the email never becomes a student username.
      const student = role === "STUDENT";
      if (!student && !u.email) { counter.skip("users", "no email, so no username (D6)", id); continue; }
      const { username, displayUsername } = student ? { username: "", displayUsername: "" } : usernamesOf(String(u.email), usernameOverrides[id]);
      if (!student && usernameOverrides[id]) counter.skip("users", "username set by the owner (no email part)", id);
      if (!student && seenUsernames.has(username)) { counter.skip("users", "duplicate lower(email) (D6)", id); continue; }
      if (!student) seenUsernames.add(username);
      users.add(id);
      userRows.push(targetUserRow(u, role, { username, displayUsername }, ids.get(MAP_TABLES.schools, u.school_id as string | null)));
    }
    const studentRows = userRows.filter((row) => row.role === "STUDENT");
    const studentIds = new Set(studentRows.map((row) => String(row.id)));
    const existing = new Map((await tx<Row[]>`select id, username from users`).map((row) => [String(row.id), String(row.username)] as const));
    const taken = new Set([...seenUsernames, ...[...existing].filter(([id]) => !studentIds.has(id)).map(([, name]) => name)]);
    const studentNames = assignStudentUsernames([...studentIds], existing, taken);
    for (const row of studentRows) row.username = row.display_username = studentNames.get(String(row.id));
    notes.push(`${studentRows.length} students have a username of two words and two digits; students keep no email (owner decisions 2026-10-08).`);
    counter.table("users").written += await upsert(tx, "users", userRows);

    const legacyAccounts = await legacy<Row[]>`select a.id, a.user_id, a.provider_id, a.password, a.created_at, a.updated_at, u.password as user_password from accounts a join users u on u.id = a.user_id`;
    counter.table("accounts").read = legacyAccounts.length;
    const accountRows: Row[] = [];
    const credentialUsers = new Set<string>();
    for (const a of legacyAccounts) {
      const id = String(a.id);
      if (!users.has(String(a.user_id))) { counter.skip("accounts", "user not migrated", id); continue; }
      if (a.provider_id !== "credential") { counter.skip("accounts", `provider '${String(a.provider_id)}' not copied (D8: no Google sign-in)`, id); continue; }
      credentialUsers.add(String(a.user_id));
      accountRows.push({ id, user_id: a.user_id, provider_id: "credential", password: a.password ?? a.user_password, created_at: a.created_at, updated_at: a.updated_at });
    }
    // A user with a legacy password but no credential account gets one (spec §6 accounts rule).
    for (const u of legacyUsers) {
      const id = String(u.id);
      if (!users.has(id) || credentialUsers.has(id) || !u.password) continue;
      accountRows.push({ id: `legacy-credential-${id}`, user_id: id, provider_id: "credential", password: u.password, created_at: u.createdAt, updated_at: u.updatedAt });
      counter.table("accounts").skipped["created from users.password"] = (counter.table("accounts").skipped["created from users.password"] ?? 0) + 1;
    }
    counter.table("accounts").written += await upsert(tx, "accounts", accountRows);

    const admins = await legacy<Row[]>`select id, "schoolId", "userId", "createdAt", "updatedAt" from school_admins`;
    counter.table("school_admins").read = admins.length;
    const adminRows: Row[] = [];
    for (const a of admins) {
      const schoolId = ids.get(MAP_TABLES.schools, a.schoolId as string);
      if (!schoolId) { counter.skip("school_admins", "school not migrated", String(a.id)); continue; }
      if (!users.has(String(a.userId))) { counter.skip("school_admins", "user not migrated", String(a.id)); continue; }
      adminRows.push({ id: ids.ensure(MAP_TABLES.schoolAdmins, String(a.id)), school_id: schoolId, user_id: a.userId, created_at: a.createdAt, updated_at: a.updatedAt });
    }
    counter.table("school_admins").written += await upsert(tx, "school_admins", adminRows);
  });

  // ── 2. classrooms, membership, licenses ─────────────────────────────────────────
  await group("classes", async (tx) => {
    const teachersByClass = new Map<string, string[]>();
    const legacyTeachers = await legacy<Row[]>`select id, "classroomId", "userId", "createdAt", "updatedAt" from classroom_teachers order by "createdAt", id`;
    for (const t of legacyTeachers) {
      const list = teachersByClass.get(String(t.classroomId)) ?? [];
      list.push(String(t.userId)); teachersByClass.set(String(t.classroomId), list);
    }
    const adminsBySchool = new Map<string, string>();
    for (const a of await legacy<Row[]>`select "schoolId", "userId" from school_admins order by "createdAt"`) {
      if (!adminsBySchool.has(String(a.schoolId)) && users.has(String(a.userId))) adminsBySchool.set(String(a.schoolId), String(a.userId));
    }
    const classrooms = await legacy<Row[]>`select id, name, "classCode", "codeExpiresAt", "createdAt", "updatedAt", grade, password_students, school_id from classrooms`;
    counter.table("classrooms").read = classrooms.length;
    const classRows: Row[] = [];
    const migratedClasses = new Set<string>();
    for (const c of classrooms) {
      const id = String(c.id);
      const own = (teachersByClass.get(id) ?? []).find((u) => users.has(u));
      const override = classroomTeacherOverrides[id];
      if (override && !users.has(override)) { counter.skip("classrooms", "the teacher override names a user that is not migrated", id); continue; }
      const teacher = own ?? override ?? adminsBySchool.get(String(c.school_id)) ?? null;
      if (!teacher) { counter.skip("classrooms", "no teacher and no school admin (spec §6 classrooms rule; assign one with --teachers)", id); continue; }
      if (!own) counter.skip("classrooms", override ? "teacher_id set from the --teachers override" : "teacher_id fell back to the school admin", id);
      const grade = parseGrade(c.grade);
      if (c.grade && grade === null) counter.skip("classrooms", "grade text not a number, stored null", id);
      migratedClasses.add(id);
      classTeachers.set(id, teacher);
      classRows.push(mapClassroom(c, { id: ids.ensure(MAP_TABLES.classrooms, id), schoolId: ids.get(MAP_TABLES.schools, c.school_id as string | null), teacherId: teacher, grade }));
    }
    // A skip that is only a note must not hide a written row: count writes from the rows.
    counter.table("classrooms").written += await upsert(tx, "classrooms", classRows);

    counter.table("classroom_teachers").read = legacyTeachers.length;
    const teacherRows: Row[] = [];
    for (const t of legacyTeachers) {
      const classroomId = ids.get(MAP_TABLES.classrooms, t.classroomId as string);
      if (!classroomId || !migratedClasses.has(String(t.classroomId))) { counter.skip("classroom_teachers", "classroom not migrated", String(t.id)); continue; }
      if (!users.has(String(t.userId))) { counter.skip("classroom_teachers", "user not migrated", String(t.id)); continue; }
      teacherRows.push({ id: ids.ensure(MAP_TABLES.classroomTeachers, String(t.id)), classroom_id: classroomId, teacher_id: t.userId, role: "member", created_at: t.createdAt });
    }
    counter.table("classroom_teachers").written += await upsert(tx, "classroom_teachers", teacherRows);

    const students = await legacy<Row[]>`select id, "studentId", "classroomId" from classroom_students`;
    counter.table("classroom_students").read = students.length;
    const studentRows: Row[] = [];
    const seenPairs = new Set<string>();
    for (const s of students) {
      const classroomId = ids.get(MAP_TABLES.classrooms, s.classroomId as string);
      if (!classroomId || !migratedClasses.has(String(s.classroomId))) { counter.skip("classroom_students", "classroom not migrated", String(s.id)); continue; }
      if (!users.has(String(s.studentId))) { counter.skip("classroom_students", "student not migrated", String(s.id)); continue; }
      const pair = `${classroomId}:${String(s.studentId)}`;
      if (seenPairs.has(pair)) { counter.skip("classroom_students", "duplicate membership", String(s.id)); continue; }
      seenPairs.add(pair);
      studentRows.push({ id: ids.ensure(MAP_TABLES.classroomStudents, String(s.id)), classroom_id: classroomId, student_id: s.studentId });
    }
    counter.table("classroom_students").written += await upsert(tx, "classroom_students", studentRows);

    const licenses = await legacy<Row[]>`select l.id, l.key, l.name, l.description, l.max_users, l.start_date, l."expiryDate", l.status, l."createdAt", l."updatedAt", l.school_id, l.subscription::text as subscription, s.name as school_name from licenses l left join schools s on s.id = l.school_id`;
    counter.table("licenses").read = licenses.length;
    const licenseRows: Row[] = [];
    for (const l of licenses) {
      const id = String(l.id);
      if (!l.school_name) { counter.skip("licenses", "no school, and school_name is required", id); continue; }
      licenseRows.push({
        id: ids.ensure(MAP_TABLES.licenses, id), key: l.key, max_users: l.max_users ?? 1, school_name: l.school_name, school_id: ids.get(MAP_TABLES.schools, l.school_id as string | null),
        expires_at: l.expiryDate, name: l.name, description: l.description, subscription: l.subscription ?? "BASIC", start_date: l.start_date, expiry_date: l.expiryDate,
        status: l.status ?? "active", created_at: l.createdAt, updated_at: l.updatedAt,
      });
    }
    counter.table("licenses").written += await upsert(tx, "licenses", licenseRows);
  });

  // ── 3. articles, questions, flashcard sentences ─────────────────────────────────
  await group("content", async (tx) => {
    const articles = await legacy<LegacyArticle[]>`select id, type, genre, sub_genre, title, summary, passage, image_description, cefr_level, ra_level, rating, audio_url, audio_word_url, sentences, words, author_id, created_at, updated_at, translated_passage, translated_summary, brainstorming, is_approved, is_draft, is_published, planning, topic from article`;
    counter.table("article").read = articles.length;
    const rows: Row[] = [];
    for (const a of articles) {
      migratedArticles.add(a.id);
      if (a.author_id && !users.has(a.author_id)) counter.skip("article", "author not migrated, author_id stored null", a.id);
      rows.push(mapArticle(a, ids.ensure(MAP_TABLES.article, a.id), Boolean(a.author_id && users.has(a.author_id))));
    }
    counter.table("article").written += await upsert(tx, "articles", rows);

    // Question order: the legacy physical row order per article (FR-3 ordering rule; Tutor reads by position).
    const mcqs = await legacy<Row[]>`select id, question, options, answer, "textualEvidence", article_id, "createdAt", "updatedAt", story_chapter_id, ${legacy.unsafe(QUESTION_ORDER_SQL)} as ord from multiple_choice_questions`;
    counter.table("multiple_choice_questions").read = mcqs.length;
    const mcqRows: Row[] = [];
    for (const q of mcqs) {
      const id = String(q.id);
      if (q.story_chapter_id) { counter.skip("multiple_choice_questions", "story chapter question (stories deferred)", id); continue; }
      const articleId = ids.get(MAP_TABLES.article, q.article_id as string | null);
      if (!articleId) { counter.skip("multiple_choice_questions", "no article", id); continue; }
      const options = (q.options as string[]) ?? [];
      const fixed = MCQ_ANSWER_FIXES[id];
      const answer = fixed ?? (q.answer as string | null);
      const correct = correctAnswerIndex(options, answer);
      if (correct < 0) { counter.skip("multiple_choice_questions", "answer not among the options (spec §6 MCQ rule)", id); continue; }
      if (fixed) counter.skip("multiple_choice_questions", "answer text set to its option (owner decision 2026-10-07)", id);
      mcqRows.push({
        id: ids.ensure(MAP_TABLES.mcq, id), article_id: articleId, question: q.question, options: jsonb(options), correct_answer: correct,
        order: Number(q.ord), answer, textual_evidence: q.textualEvidence, chapter_id: null, created_at: q.createdAt, updated_at: q.updatedAt,
      });
    }
    counter.table("multiple_choice_questions").written += await upsert(tx, "multiple_choice_questions", mcqRows);

    const saqs = await legacy<Row[]>`select id, question, answer, article_id, "createdAt", "updatedAt", story_chapter_id, ${legacy.unsafe(QUESTION_ORDER_SQL)} as ord from short_answer_questions`;
    counter.table("short_answer_questions").read = saqs.length;
    const saqRows: Row[] = [];
    for (const q of saqs) {
      const id = String(q.id);
      if (q.story_chapter_id) { counter.skip("short_answer_questions", "story chapter question (stories deferred)", id); continue; }
      const articleId = ids.get(MAP_TABLES.article, q.article_id as string | null);
      if (!articleId) { counter.skip("short_answer_questions", "no article", id); continue; }
      saqRows.push({ id: ids.ensure(MAP_TABLES.saq, id), article_id: articleId, question: q.question, sample_answer: q.answer, order: Number(q.ord), answer: q.answer, chapter_id: null, created_at: q.createdAt, updated_at: q.updatedAt });
    }
    counter.table("short_answer_questions").written += await upsert(tx, "short_answer_questions", saqRows);

    const laqs = await legacy<Row[]>`select id, question, article_id, "createdAt", "updatedAt", story_chapter_id from long_answer_questions`;
    counter.table("long_answer_questions").read = laqs.length;
    const laqRows: Row[] = [];
    for (const q of laqs) {
      const id = String(q.id);
      if (q.story_chapter_id) { counter.skip("long_answer_questions", "story chapter question (stories deferred)", id); continue; }
      const articleId = ids.get(MAP_TABLES.article, q.article_id as string | null);
      if (!articleId) { counter.skip("long_answer_questions", "no article", id); continue; }
      laqRows.push({ id: ids.ensure(MAP_TABLES.laq, id), article_id: articleId, question: q.question, chapter_id: null, created_at: q.createdAt, updated_at: q.updatedAt });
    }
    counter.table("long_answer_questions").written += await upsert(tx, "long_answer_questions", laqRows);

    const cards = await legacy<Row[]>`select id, sentence, audio_sentences_url, words, words_url, "createdAt", "updatedAt", article_id, story_chapter_id from sentencs_and_words_for_flashcard`;
    counter.table("sentencs_and_words_for_flashcard").read = cards.length;
    const cardRows: Row[] = [];
    for (const c of cards) {
      const id = String(c.id);
      if (c.story_chapter_id) { counter.skip("sentencs_and_words_for_flashcard", "story chapter row (stories deferred)", id); continue; }
      const articleId = ids.get(MAP_TABLES.article, c.article_id as string | null);
      if (!articleId) { counter.skip("sentencs_and_words_for_flashcard", "no article", id); continue; }
      cardRows.push({
        id: ids.ensure(MAP_TABLES.flashcard, id), article_id: articleId, sentence: jsonb(c.sentence), audio_sentences_url: c.audio_sentences_url,
        words: jsonb(c.words), words_url: c.words_url, created_at: c.createdAt, updated_at: c.updatedAt,
      });
    }
    counter.table("sentencs_and_words_for_flashcard").written += await upsert(tx, "sentencs_and_words_for_flashcard", cardRows);
  });

  // ── 4. assignments, activity, progress, xp ─────────────────────────────────────
  await group("activity", async (tx) => {
    const logs = await legacy<Row[]>`select id, article_id, user_id, "createdAt", "updatedAt", "isRead", "isMultipleChoiceQuestionCompleted", "isShortAnswerQuestionCompleted", "isLongAnswerQuestionCompleted", "isRated", "isSentenceAndWordsSaved", "isSentenceMatchingCompleted", "isSentenceOrderingCompleted", "isSentenceWordOrderingCompleted", "isSentenceClozeTestCompleted" from article_activity_logs`;
    counter.table("article_activity_logs").read = logs.length;
    const logRows: Row[] = [];
    for (const l of logs) {
      const id = String(l.id);
      const articleId = ids.get(MAP_TABLES.article, l.article_id as string);
      if (!articleId) { counter.skip("article_activity_logs", "article not migrated", id); continue; }
      if (!users.has(String(l.user_id))) { counter.skip("article_activity_logs", "user not migrated", id); continue; }
      logRows.push({
        id: ids.ensure(MAP_TABLES.articleActivityLogs, id), article_id: articleId, user_id: l.user_id, is_read: l.isRead ?? false,
        is_multiple_choice_question_completed: l.isMultipleChoiceQuestionCompleted ?? false, is_short_answer_question_completed: l.isShortAnswerQuestionCompleted ?? false,
        is_long_answer_question_completed: l.isLongAnswerQuestionCompleted ?? false, is_rated: l.isRated ?? false, is_sentence_and_words_saved: l.isSentenceAndWordsSaved ?? false,
        is_sentence_matching_completed: l.isSentenceMatchingCompleted ?? false, is_sentence_ordering_completed: l.isSentenceOrderingCompleted ?? false,
        is_sentence_word_ordering_completed: l.isSentenceWordOrderingCompleted ?? false, is_sentence_cloze_test_completed: l.isSentenceClozeTestCompleted ?? false,
        created_at: l.createdAt, updated_at: l.updatedAt,
      });
    }
    counter.table("article_activity_logs").written += await upsert(tx, "article_activity_logs", logRows);

    const assignments = await legacy<Row[]>`select a.id, a.name, a.description, a.classroom_id, a.article_id, a.teacher_id, a.teacher_name, a.due_date, a."createdAt", a."updatedAt", ar.title as article_title from assignments a left join article ar on ar.id = a.article_id`;
    counter.table("assignments").read = assignments.length;
    const assignmentRows: Row[] = [];
    const migratedAssignments = new Set<string>();
    for (const a of assignments) {
      const id = String(a.id);
      const classroomId = ids.get(MAP_TABLES.classrooms, a.classroom_id as string);
      if (!classroomId) { counter.skip("assignments", "classroom not migrated", id); continue; }
      const teacherId = users.has(String(a.teacher_id)) ? String(a.teacher_id) : classTeachers.get(String(a.classroom_id));
      if (!teacherId) { counter.skip("assignments", "teacher not migrated", id); continue; }
      if (teacherId !== String(a.teacher_id)) counter.skip("assignments", "teacher_id fell back to the classroom teacher (the assignment's teacher is not migrated)", id);
      const articleId = ids.get(MAP_TABLES.article, a.article_id as string | null);
      migratedAssignments.add(id);
      assignmentRows.push({
        id: ids.ensure(MAP_TABLES.assignments, id), title: a.name ?? a.article_title ?? "Assignment", classroom_id: classroomId, teacher_id: teacherId, article_id: articleId,
        due_date: a.due_date, type: "article", description: a.description, teacher_name: a.teacher_name, created_at: a.createdAt, updated_at: a.updatedAt,
      });
    }
    counter.table("assignments").written += await upsert(tx, "assignments", assignmentRows);

    const assigned = await legacy<Row[]>`select id, assignment_id, student_id, status::text as status, started_at, completed_at, "createdAt", "updatedAt", score from assignment_students`;
    counter.table("assignment_students").read = assigned.length;
    const assignedRows: Row[] = [];
    for (const s of assigned) {
      const id = String(s.id);
      const assignmentId = ids.get(MAP_TABLES.assignments, s.assignment_id as string);
      if (!assignmentId || !migratedAssignments.has(String(s.assignment_id))) { counter.skip("assignment_students", "assignment not migrated", id); continue; }
      if (!users.has(String(s.student_id))) { counter.skip("assignment_students", "student not migrated", id); continue; }
      const { status, completed } = mapAssignmentStatus(s.status);
      assignedRows.push({ id: ids.ensure(MAP_TABLES.assignmentStudents, id), assignment_id: assignmentId, student_id: s.student_id, completed, status, score: s.score, started_at: s.started_at, completed_at: s.completed_at, created_at: s.createdAt, updated_at: s.updatedAt });
    }
    counter.table("assignment_students").written += await upsert(tx, "student_assignments", assignedRows);

    const progress = await legacy<Row[]>`select id, user_id, article_id, progress, "timeSpent", "isCompleted", "createdAt", "updatedAt", assignment_id, score from user_lesson_progress`;
    counter.table("user_lesson_progress").read = progress.length;
    const progressCandidates: Row[] = [];
    for (const p of progress) {
      const id = String(p.id);
      const articleId = ids.get(MAP_TABLES.article, p.article_id as string);
      if (!articleId) { counter.skip("user_lesson_progress", "article not migrated", id); continue; }
      if (!users.has(String(p.user_id))) { counter.skip("user_lesson_progress", "user not migrated", id); continue; }
      progressCandidates.push({ ...p, _articleId: articleId });
    }
    const { kept, dropped } = keepLatest(progressCandidates, (p) => `${String(p.user_id)}:${String(p._articleId)}`, (p) => p.updatedAt as Date);
    for (const d of dropped) counter.skip("user_lesson_progress", "duplicate (user, article); the latest row kept", String(d.id));
    const progressRows = kept.map((p) => ({
      id: ids.ensure(MAP_TABLES.userLessonProgress, String(p.id)), user_id: p.user_id, lesson_id: p._articleId, status: lessonStatusOf(p.isCompleted as boolean | null, p.progress as number | null),
      progress: p.progress ?? 0, completed_at: p.isCompleted ? p.updatedAt : null, article_id: p._articleId, assignment_id: ids.get(MAP_TABLES.assignments, p.assignment_id as string | null),
      time_spent: p.timeSpent ?? 0, is_completed: p.isCompleted ?? false, created_at: p.createdAt, updated_at: p.updatedAt,
    }));
    counter.table("user_lesson_progress").written += await upsert(tx, "lesson_progress", progressRows);
    notes.push("lesson_progress.lesson_id holds the new article uuid as text (inventory R10 decision).");

    const activities = await legacy<Row[]>`select id, user_id, "activityType"::text as activity_type, "targetId", timer, details, completed, "createdAt", "updatedAt" from user_activities`;
    counter.table("user_activities").read = activities.length;
    const activityCandidates: Row[] = [];
    for (const a of activities) {
      if (!users.has(String(a.user_id))) { counter.skip("user_activities", "user not migrated", String(a.id)); continue; }
      const target = a.targetId as string | null;
      activityCandidates.push({ ...a, _target: (target && ids.get(MAP_TABLES.article, target)) || target });
    }
    const acts = keepLatest(activityCandidates, (a) => `${String(a.user_id)}:${String(a.activity_type)}:${String(a._target ?? `null:${String(a.id)}`)}`, (a) => a.updatedAt as Date);
    for (const d of acts.dropped) counter.skip("user_activities", "duplicate (user, type, target); the latest row kept (null targets are distinct)", String(d.id));
    const activityRows = acts.kept.map((a) => ({
      id: ids.ensure(MAP_TABLES.userActivities, String(a.id)), user_id: a.user_id, activity_type: a.activity_type, xp_earned: 0, target_id: a._target,
      timer: a.timer, details: jsonb(a.details), completed: a.completed ?? false, created_at: a.createdAt, updated_at: a.updatedAt,
    }));
    counter.table("user_activities").written += await upsert(tx, "user_activity", activityRows);

    const xp = await legacy<Row[]>`select id, user_id, "xpEarned", "activityId", "activityType"::text as activity_type, "createdAt", "updatedAt" from xp_logs`;
    counter.table("xp_logs").read = xp.length;
    const xpRows: Row[] = [];
    for (const x of xp) {
      const id = String(x.id);
      if (!users.has(String(x.user_id))) { counter.skip("xp_logs", "user not migrated", id); continue; }
      if (!x.activityId) counter.skip("xp_logs", "null activityId kept as null activity_id", id);
      const activityId = x.activityId ? (ids.get(MAP_TABLES.userActivities, String(x.activityId)) ?? String(x.activityId)) : null;
      xpRows.push({ id: ids.ensure(MAP_TABLES.xpLogs, id), user_id: x.user_id, xp_earned: x.xpEarned ?? 0, activity_id: activityId, activity_type: x.activity_type, created_at: x.createdAt, updated_at: x.updatedAt });
    }
    counter.table("xp_logs").written += await upsert(tx, "xp_logs", xpRows);
  });

  // ── 5. saved words and sentences (owner decision 2026-10-07, option A) ──────────
  // The target card keeps the text, the article, and the review dates; FSRS stability and
  // difficulty have no column (inventory R2), so the review action starts again from the counts.
  await group("flashcards", async (tx) => {
    const decks = await legacy<Row[]>`select id, user_id, name, type::text as type, description, "createdAt", "updatedAt" from flashcard_decks`;
    counter.table("flashcard_decks").read = decks.length;
    const deckRows: Row[] = [];
    const deckUser = new Map<string, string>();
    for (const d of decks) {
      const id = String(d.id);
      if (!users.has(String(d.user_id))) { counter.skip("flashcard_decks", "user not migrated", id); continue; }
      deckUser.set(id, String(d.user_id));
      deckRows.push({
        id: ids.ensure(MAP_TABLES.flashcardDecks, id), user_id: d.user_id, name: d.name ?? `${d.type === "VOCABULARY" ? "Vocabulary" : "Sentence"} Deck`,
        type: d.type, description: d.description, created_at: d.createdAt, updated_at: d.updatedAt,
      });
    }
    counter.table("flashcard_decks").written += await upsert(tx, "flashcard_decks", deckRows);

    const ratingsByCard = new Map<string, number[]>();
    const reviews = await legacy<Row[]>`select id, card_id, rating, time_spent, "reviewedAt" from card_reviews order by "reviewedAt", id`;
    for (const r of reviews) ratingsByCard.set(String(r.card_id), [...(ratingsByCard.get(String(r.card_id)) ?? []), Number(r.rating)]);

    const cards = await legacy<Row[]>`select id, deck_id, type::text as type, article_id, word, sentence, due, last_review, story_chapter_id, "createdAt", "updatedAt" from flashcard_cards`;
    counter.table("flashcard_cards").read = cards.length;
    const cardRows: Row[] = [];
    const progressRows: Row[] = [];
    for (const c of cards) {
      const id = String(c.id);
      if (c.story_chapter_id) { counter.skip("flashcard_cards", "story chapter card (stories deferred)", id); continue; }
      const userId = deckUser.get(String(c.deck_id));
      if (!userId) { counter.skip("flashcard_cards", "deck not migrated", id); continue; }
      const articleId = ids.get(MAP_TABLES.article, c.article_id as string | null);
      if (!articleId) { counter.skip("flashcard_cards", "article not migrated", id); continue; }
      const text = cardTextOf(c);
      if (!text) { counter.skip("flashcard_cards", "no word or sentence text", id); continue; }
      const cardId = ids.ensure(MAP_TABLES.flashcardCards, id);
      cardRows.push({ id: cardId, deck_id: ids.get(MAP_TABLES.flashcardDecks, String(c.deck_id)), front: text, back: text, source_id: articleId, order: 0, created_at: c.createdAt });
      if (!c.last_review) continue;
      // One progress row per reviewed card, with the card's uuid as its id, so a rerun updates it.
      const { correct, incorrect } = reviewCountsOf(ratingsByCard.get(id) ?? []);
      progressRows.push({
        id: cardId, user_id: userId, card_id: cardId, correct_count: correct, incorrect_count: incorrect,
        last_reviewed_at: c.last_review, next_review_at: c.due, created_at: c.createdAt, updated_at: c.updatedAt,
      });
    }
    counter.table("flashcard_cards").written += await upsert(tx, "flashcard_cards", cardRows);
    counter.table("flashcard_cards.last_review").read = cards.filter((c) => c.last_review).length;
    counter.table("flashcard_cards.last_review").written += await upsert(tx, "flashcard_progress", progressRows);

    counter.table("card_reviews").read = reviews.length;
    const reviewRows: Row[] = [];
    for (const r of reviews) {
      const cardId = ids.get(MAP_TABLES.flashcardCards, String(r.card_id));
      if (!cardId) { counter.skip("card_reviews", "card not migrated", String(r.id)); continue; }
      reviewRows.push({ id: ids.ensure(MAP_TABLES.cardReviews, String(r.id)), card_id: cardId, rating: r.rating, time_spent: r.time_spent, reviewed_at: r.reviewedAt });
    }
    counter.table("card_reviews").written += await upsert(tx, "card_reviews", reviewRows);

    // The reader and the games read a card's meaning, translation, and audio from its article; a
    // content reload can drop a saved word from the article's word list.
    const [loose] = await tx<{ words: number; sentences: number }[]>`
      select count(*) filter (where d.type = 'VOCABULARY' and not exists (
               select 1 from jsonb_array_elements(coalesce(s.words, '[]'::jsonb)) w where lower(trim(w->>'vocabulary')) = lower(trim(c.front))))::int as words,
             count(*) filter (where d.type = 'SENTENCE' and not exists (
               select 1 from jsonb_array_elements(coalesce(a.sentences, '[]'::jsonb)) x where x->>'sentence' = c.front))::int as sentences
      from flashcard_cards c join flashcard_decks d on d.id = c.deck_id
      left join articles a on a.id::text = c.source_id
      left join sentencs_and_words_for_flashcard s on s.article_id::text = c.source_id`;
    notes.push(`Saved cards whose text is no longer in their article: ${loose?.words ?? 0} words (not in the word list, so no meaning or audio), ${loose?.sentences ?? 0} sentences (not in the article text, so no translation).`);
    notes.push("flashcard_progress keeps due, last review, and the review counts; FSRS stability and difficulty have no column (inventory R2).");
  });

  };

  if (dryRun) {
    await target.begin(async (outer) => {
      open = (body) => outer.savepoint(body);
      await main();
      throw new DryRunRollback();
    }).catch((e: unknown) => { if (!(e instanceof DryRunRollback)) throw e; });
  } else await main();

  notes.push(`${migratedArticles.size} legacy articles carry their legacy id in articles.image (D10).`);
  return { startedAt, finishedAt: new Date().toISOString(), dryRun, tables: counter.tables, dropped: DROPPED_TABLES, notes };
}

class DryRunRollback extends Error {
  constructor() { super("dry run: rolled back"); }
}

/** Renders the report as Markdown for the track evidence folder. */
export function renderReport(report: ImportReport): string {
  const TARGET_NAME: Record<string, string> = { article: "articles", assignment_students: "student_assignments", user_lesson_progress: "lesson_progress", user_activities: "user_activity", "flashcard_cards.last_review": "flashcard_progress" };
  const lines = [`# Primary legacy import report`, ``, `Started ${report.startedAt}, finished ${report.finishedAt}${report.dryRun ? " (dry run, rolled back)" : ""}.`, ``, `| Legacy table | Read | Written | Skipped |`, `|---|---|---|---|`];
  for (const [name, t] of Object.entries(report.tables)) {
    const skipped = Object.entries(t.skipped).map(([reason, n]) => `${n} ${reason}`).join("; ") || "0";
    const label = TARGET_NAME[name] ? `${name} → ${TARGET_NAME[name]}` : name;
    lines.push(`| ${label} | ${t.read} | ${t.written} | ${skipped} |`);
  }
  const examples = Object.entries(report.tables).flatMap(([name, t]) => Object.entries(t.examples).map(([reason, ids]) => `- ${name}, ${reason}: ${ids.join(", ")}${(t.skipped[reason] ?? 0) > ids.length ? ", …" : ""}`));
  if (examples.length) lines.push(``, `## Skipped rows (legacy ids, up to 20 per reason)`, ``, ...examples);
  lines.push(``, `## Dropped or deferred`, ``);
  for (const d of report.dropped) lines.push(`- ${d.table}: ${d.reason}`);
  if (report.notes.length) { lines.push(``, `## Notes`, ``); for (const n of report.notes) lines.push(`- ${n}`); }
  return lines.join("\n") + "\n";
}
