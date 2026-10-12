/**
 * Read-only data profile of the read-along timings (track primary_parity_read_along_20261011).
 * Prints the counts as Markdown. With `--fixtures <dir>` it also writes one small real
 * `sentences` array for each sentence shape. It runs in a read-only transaction.
 *
 * Usage (from the app folder):
 *   DATABASE_URL=postgres://postgres:postgres@localhost:5432/primary_etl_20261007 \
 *     ../../node_modules/.bin/tsx scripts/profile-read-along.ts [--fixtures lib/read-along/__tests__/fixtures]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import postgres from "postgres";
import { classifySentence, profileArticles, type ProfileSentence, type ProfileTag } from "../lib/read-along/profile";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL to the database copy to profile.");
const fixturesDir = process.argv.includes("--fixtures") ? process.argv[process.argv.indexOf("--fixtures") + 1] : null;

const sql = postgres(url, { max: 1 });
const rows = (await sql.begin("read only", (tx) =>
  tx`select id::text as id, sentences from articles order by id`,
)) as unknown as { id: string; sentences: ProfileSentence[] | null }[];
await sql.end();

const profile = profileArticles(rows);
const lines = [
  `Articles: ${profile.articles}`,
  `Articles with sentences: ${profile.withSentences}`,
  `Sentences: ${profile.sentences}`,
  "",
  "| Tag | Sentences | Articles |",
  "| --- | --- | --- |",
  ...Object.keys(profile.tagCounts)
    .sort()
    .map((tag) => `| ${tag} | ${profile.tagCounts[tag]} | ${profile.articlesWithTag[tag]} |`),
];
console.log(lines.join("\n"));

if (fixturesDir) {
  mkdirSync(fixturesDir, { recursive: true });
  const wanted: ProfileTag[] = ["no-words", "audio-dropped", "audio-extra", "word-mismatch", "curly-quote", "contraction", "digit", "hyphen"];
  for (const tag of wanted) {
    const hits = rows.flatMap((row) => (row.sentences ?? []).filter((s) => classifySentence(s).tags.includes(tag)).map((s) => ({ id: row.id, s })));
    // The shortest sentence of the tag keeps the fixture small; "word-mismatch" and the quote tags need a real hit.
    hits.sort((a, b) => a.s.sentence.length - b.s.sentence.length);
    const pick = hits.find((h) => tag === "no-words" || h.s.sentence.length > 20) ?? hits[0];
    if (!pick) {
      console.log(`no sentence for ${tag}`);
      continue;
    }
    writeFileSync(`${fixturesDir}/${tag}.json`, `${JSON.stringify([pick.s], null, 2)}\n`);
  }
}
