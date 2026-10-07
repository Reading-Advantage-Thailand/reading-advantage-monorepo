#!/usr/bin/env tsx
/**
 * Go/no-go check (cutover spec §10): for sampled students, compares the profile, XP rows, reading
 * history, and saved cards of the legacy Primary database with the migrated database. Read only.
 *
 *   pnpm --filter @reading-advantage/db run student-sample-check --legacy <url> --target <url> [--students N | --ids id1,id2]
 *
 * Default sample: 5 students with reading logs, XP rows, and saved cards, in md5(id) order.
 * Target rows go back to legacy ids through `primary_legacy_id_map`. Story chapter cards stay out
 * (stories are deferred, spec §6). Output names students by legacy id only.
 * Exit: 0 match, 1 difference, 2 connection or config error.
 */
import postgres from "postgres";
import { buildPostgresOptions, normalizePostgresConnectionString } from "../src/connection-options.js";
import { diffRows, type Difference } from "../src/tutor-read-compare.js";

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const legacyUrl = flag("--legacy");
const targetUrl = flag("--target");
if (!legacyUrl || !targetUrl) {
  console.error("Usage: student-sample-check --legacy <url> --target <url> [--students N | --ids id1,id2]");
  process.exit(2);
}

type Sql = ReturnType<typeof postgres>;
type Row = Record<string, unknown>;

const connect = (url: string): Sql =>
  postgres(normalizePostgresConnectionString(url), {
    ...buildPostgresOptions(url),
    max: 1,
    connection: { default_transaction_read_only: "on" },
  });

const AT = "YYYY-MM-DD HH24:MI:SS.MS";

/** Reads one student's rows from the legacy database, keyed by legacy id. */
async function legacyRows(sql: Sql, ids: string[]): Promise<Record<string, Row[]>> {
  return {
    profile: await sql`select id, id as user_id, name, xp, coalesce(level, 1) as level, coalesce("cefrLevel", 'A1-') as cefr, upper(role) as role from users where id = any(${ids})`,
    reading: await sql`
      select l.id, l.user_id, l.article_id as article, a.title, coalesce(l."isRead", false) as read,
        coalesce(l."isMultipleChoiceQuestionCompleted", false) as mcq, coalesce(l."isShortAnswerQuestionCompleted", false) as saq,
        coalesce(l."isLongAnswerQuestionCompleted", false) as laq, coalesce(l."isRated", false) as rated,
        coalesce(l."isSentenceAndWordsSaved", false) as saved
      from article_activity_logs l join article a on a.id = l.article_id where l.user_id = any(${ids})`,
    xp: await sql`select id, user_id, "xpEarned" as xp, "activityType"::text as type, to_char("createdAt", ${AT}) as at from xp_logs where user_id = any(${ids})`,
    cards: await sql`
      select c.id, d.user_id, c.article_id as article, c.type::text as type,
        case when c.type::text = 'VOCABULARY' then c.word else c.sentence end as text,
        (select count(*)::int from card_reviews r where r.card_id = c.id) as reviews
      from flashcard_cards c join flashcard_decks d on d.id = c.deck_id
      where d.user_id = any(${ids}) and c.story_chapter_id is null`,
  };
}

/** Reads the same rows from the migrated database and maps their ids back to legacy ids. */
async function targetRows(sql: Sql, ids: string[]): Promise<Record<string, Row[]>> {
  return {
    profile: await sql`select id, id as user_id, name, xp, level, cefr_level as cefr, role::text as role from users where id = any(${ids})`,
    reading: await sql`
      select coalesce(ml.legacy_id, 'new:' || l.id) as id, l.user_id, ma.legacy_id as article, a.title, l.is_read as read,
        l.is_multiple_choice_question_completed as mcq, l.is_short_answer_question_completed as saq,
        l.is_long_answer_question_completed as laq, l.is_rated as rated, l.is_sentence_and_words_saved as saved
      from article_activity_logs l join articles a on a.id = l.article_id
      left join primary_legacy_id_map ml on ml.table_name = 'article_activity_logs' and ml.new_id = l.id
      left join primary_legacy_id_map ma on ma.table_name = 'article' and ma.new_id = l.article_id
      where l.user_id = any(${ids})`,
    xp: await sql`
      select coalesce(m.legacy_id, 'new:' || x.id) as id, x.user_id, x.xp_earned as xp, x.activity_type as type, to_char(x.created_at, ${AT}) as at
      from xp_logs x left join primary_legacy_id_map m on m.table_name = 'xp_logs' and m.new_id = x.id
      where x.user_id = any(${ids})`,
    cards: await sql`
      select coalesce(mc.legacy_id, 'new:' || c.id) as id, d.user_id, ma.legacy_id as article, d.type as type, c.front as text,
        (select count(*)::int from card_reviews r where r.card_id = c.id) as reviews
      from flashcard_cards c join flashcard_decks d on d.id = c.deck_id
      left join primary_legacy_id_map mc on mc.table_name = 'flashcard_cards' and mc.new_id = c.id
      left join primary_legacy_id_map ma on ma.table_name = 'article' and ma.new_id::text = c.source_id
      where d.user_id = any(${ids})`,
  };
}

const legacy = connect(legacyUrl);
const target = connect(targetUrl);
try {
  const ids = flag("--ids")?.split(",").filter(Boolean) ?? (await legacy<{ id: string }[]>`
    select u.id from users u
    where u.role = 'student'
      and exists (select 1 from article_activity_logs l where l.user_id = u.id)
      and exists (select 1 from xp_logs x where x.user_id = u.id)
      and exists (select 1 from flashcard_decks d join flashcard_cards c on c.deck_id = d.id where d.user_id = u.id and c.story_chapter_id is null)
    order by md5(u.id) limit ${Number(flag("--students") ?? 5)}`).map((r) => r.id);
  const [ref, got] = await Promise.all([legacyRows(legacy, ids), targetRows(target, ids)]);

  let failed = 0;
  for (const id of ids) {
    const mine = (rows: Row[]) => rows.filter((r) => r.user_id === id);
    const diffs: Array<Difference & { part: string }> = Object.keys(ref).flatMap((part) =>
      diffRows(mine(ref[part]), mine(got[part])).map((d) => ({ ...d, part })));
    const xp = mine(ref.xp);
    const cards = mine(ref.cards);
    const summary = `reading ${mine(ref.reading).length}, xp rows ${xp.length} (${xp.reduce((s, r) => s + Number(r.xp), 0)}), cards ${cards.length} (reviews ${cards.reduce((s, r) => s + Number(r.reviews), 0)})`;
    if (diffs.length) failed += 1;
    console.log([diffs.length ? "DIFF" : "OK  ", id, summary].join("\t"));
    for (const d of diffs.slice(0, 20)) console.log(`      ${d.part} ${d.kind} ${d.detail}`);
  }
  console.log(`${ids.length - failed} of ${ids.length} sampled students match.`);
  process.exitCode = failed || ids.length === 0 ? 1 : 0;
} catch (err) {
  console.error("[student-sample-check] failed:", err);
  process.exitCode = 2;
} finally {
  await Promise.all([legacy.end(), target.end()]);
}
