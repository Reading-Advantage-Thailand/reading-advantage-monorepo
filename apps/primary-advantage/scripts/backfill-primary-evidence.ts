/**
 * One-time backfill of the mastery evidence queue (track primary_mastery_evidence_20261006, FR-5d).
 * Enqueues one `primary.mastery.evidence` job for every existing quiz row, flashcard review, and
 * story game run. The job key is `<jobName>:<sourceTable>:<rowId>`, so a rerun skips the rows that
 * already have a job, and the worker's own idempotency key keeps the mastery rows unique.
 *
 * The script writes only to `durable_jobs`; the worker writes the evidence. It refuses production
 * unless BACKFILL_ALLOW_PRODUCTION=1, and it prints the counts without writing unless `--apply` is set.
 *
 * Usage (from the app folder):
 *   pnpm evidence:backfill                      # dry run: counts per source and per school
 *   pnpm evidence:backfill -- --apply           # enqueue
 *   pnpm evidence:backfill -- --apply --school <schoolId>
 */
import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";
import { createDurableJobQueuePort } from "@reading-advantage/backend/jobs/adapters/postgres";
import { db } from "@reading-advantage/db";
import { client } from "@reading-advantage/db/client";
import { cardReviews, durableJobs, flashcardCards, flashcardDecks, gameCompletions, userActivity, users } from "@reading-advantage/db/schema";
import { enqueuePrimaryEvidence, PRIMARY_EVIDENCE_JOB_NAME, primaryEvidenceJobKey, type PrimaryEvidenceJobPayload } from "@reading-advantage/domain/primary-mastery";
import { createPrimaryEvidenceSql } from "../lib/primary-evidence-sql";

const queueSql = createPrimaryEvidenceSql();

const QUIZ_ACTIVITY_TYPES = ["MC_QUESTION", "SA_QUESTION", "LA_QUESTION"];

interface SourceRow {
  payload: PrimaryEvidenceJobPayload;
  schoolId: string;
  occurredAt: Date;
}

/**
 * Reads the command line: `--apply` writes, `--school <id>` limits the run to one school.
 * @param argv The process arguments after the script path.
 * @returns The parsed options.
 */
function parseArgs(argv: string[]): { apply: boolean; schoolId: string | null } {
  const schoolIndex = argv.indexOf("--school");
  return { apply: argv.includes("--apply"), schoolId: schoolIndex >= 0 ? (argv[schoolIndex + 1] ?? null) : null };
}

/**
 * Lists the source rows of the three evidence surfaces with their school.
 * @param schoolId Limits the list to one school when set.
 * @returns The rows to enqueue, oldest first across all sources.
 */
async function listSourceRows(schoolId: string | null): Promise<SourceRow[]> {
  const schoolFilter = (column: typeof users.schoolId | typeof gameCompletions.schoolId) => (schoolId ? eq(column, schoolId) : undefined);
  const quizzes = await db
    .select({ rowId: userActivity.id, schoolId: users.schoolId, occurredAt: userActivity.createdAt })
    .from(userActivity)
    .innerJoin(users, eq(users.id, userActivity.userId))
    .where(and(inArray(userActivity.activityType, QUIZ_ACTIVITY_TYPES), schoolFilter(users.schoolId)))
    .orderBy(userActivity.createdAt);
  const reviews = await db
    .select({ rowId: cardReviews.id, schoolId: users.schoolId, occurredAt: cardReviews.reviewedAt })
    .from(cardReviews)
    .innerJoin(flashcardCards, eq(flashcardCards.id, cardReviews.cardId))
    .innerJoin(flashcardDecks, eq(flashcardDecks.id, flashcardCards.deckId))
    .innerJoin(users, eq(users.id, flashcardDecks.userId))
    .where(schoolFilter(users.schoolId))
    .orderBy(cardReviews.reviewedAt);
  const runs = await db
    .select({ rowId: gameCompletions.id, schoolId: gameCompletions.schoolId, occurredAt: gameCompletions.createdAt })
    .from(gameCompletions)
    .where(and(sql`${gameCompletions.metadata} -> 'learningEvidence' ->> 'kind' = 'story-game'`, schoolFilter(gameCompletions.schoolId)))
    .orderBy(gameCompletions.createdAt);
  const rows: SourceRow[] = [];
  const push = (sourceTable: PrimaryEvidenceJobPayload["sourceTable"], list: Array<{ rowId: string; schoolId: string | null; occurredAt: Date }>) => {
    for (const row of list) if (row.schoolId) rows.push({ payload: { sourceTable, rowId: row.rowId }, schoolId: row.schoolId, occurredAt: row.occurredAt });
  };
  push("user_activity", quizzes);
  push("card_reviews", reviews);
  push("game_completions", runs);
  return rows.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
}

/**
 * Lists the job keys that already exist, so a rerun enqueues only new rows.
 * @returns The idempotency keys of every existing evidence job.
 */
async function existingJobKeys(): Promise<Set<string>> {
  const rows = await db.select({ key: durableJobs.idempotencyKey }).from(durableJobs).where(eq(durableJobs.jobName, PRIMARY_EVIDENCE_JOB_NAME));
  return new Set(rows.map((row) => row.key));
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.BACKFILL_ALLOW_PRODUCTION !== "1") {
    throw new Error("Refusing to run in production without BACKFILL_ALLOW_PRODUCTION=1");
  }
  const options = parseArgs(process.argv.slice(2));
  const rows = await listSourceRows(options.schoolId);
  const existing = await existingJobKeys();
  const pending = rows.filter((row) => !existing.has(primaryEvidenceJobKey(row.payload)));
  const counts: Record<string, number> = {};
  for (const row of pending) counts[`${row.payload.sourceTable}@${row.schoolId}`] = (counts[`${row.payload.sourceTable}@${row.schoolId}`] ?? 0) + 1;
  console.log(JSON.stringify({ event: "primary.mastery.evidence.backfill.plan", total: rows.length, alreadyQueued: rows.length - pending.length, toEnqueue: pending.length, counts }));
  if (!options.apply) {
    console.log("Dry run. Pass --apply to enqueue.");
    return;
  }
  const port = createDurableJobQueuePort({ sql: queueSql });
  const outcomes: Record<string, number> = {};
  // The queue claims by available_at, then id: one millisecond apart keeps each card's reviews in practice order.
  const start = Date.now();
  for (const [index, row] of pending.entries()) {
    const result = await enqueuePrimaryEvidence({ port, payload: row.payload, schoolId: row.schoolId, now: new Date(start + index).toISOString() });
    outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
  }
  console.log(JSON.stringify({ event: "primary.mastery.evidence.backfill.done", outcomes }));
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => Promise.all([client.end(), queueSql.end()]));
