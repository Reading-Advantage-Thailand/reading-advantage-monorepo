// Receives the Storytime weeks from the Workbooks repo (track storytime_advantage_program_20261021,
// qr-page-spec section 9; runbook docs/runbooks/storytime-week-sync.md). For each
// content/storytime/l<level>/w<nn>.json it keeps only the fields of the public QR page (the
// teacher scripts stay in Workbooks), writes content/storytime/l<level>/w<nn>.json in the app,
// writes the week index content/storytime/weeks.ts, and lists the media of the published weeks
// for the bucket. It uploads nothing.
//   pnpm tsx scripts/storytime/receive-weeks.ts [--workbooks ~/Desktop/Workbooks]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { blendParts } from "../../lib/storytime/blend";
import { publishedWeek, storytimeWeekSchema } from "../../lib/storytime/week";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const source = join(arg("--workbooks") ?? join(homedir(), "Desktop/Workbooks"), "content/storytime");
const target = new URL("../../content/storytime/", import.meta.url).pathname;

const problems: string[] = [];
const index: string[] = [];
const media = new Set<string>();
for (const levelDir of readdirSync(source).filter((d) => /^l[1-4]$/.test(d)).sort()) {
  for (const file of readdirSync(join(source, levelDir)).filter((f) => /^w\d{2}\.json$/.test(f)).sort()) {
    const raw = JSON.parse(readFileSync(join(source, levelDir, file), "utf8"));
    const parsed = storytimeWeekSchema.safeParse(raw);
    if (!parsed.success) {
      problems.push(`${levelDir}/${file}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
      continue;
    }
    const { level, week, status } = parsed.data.meta;
    mkdirSync(join(target, levelDir), { recursive: true });
    writeFileSync(join(target, levelDir, file), `${JSON.stringify(parsed.data, null, 2)}\n`);
    index.push(`  "${level}/${week}": () => import("./${levelDir}/${file}").then((m) => m.default),`);
    if (status !== "published") continue;
    if (!publishedWeek(parsed.data, level, week)) problems.push(`${levelDir}/${file}: published, but not exactly one book of each kind`);
    // Every media path of a published week must exist in Workbooks before the bucket upload.
    const paths = (JSON.stringify(parsed.data).match(/"(?:file|audio|video|videoPhone|poster|posterPhone|karaoke)":"([^"]+)"/g) ?? []).map(
      (path) => path.split('":"')[1].slice(0, -1),
    );
    // The sounds of the words that blend on a tap (lib/storytime/blend.ts): a decodable book that is not a sound book.
    for (const book of parsed.data.books.filter((b) => b.kind === "decodable" && !b.soundBook)) {
      const tricky = new Set((book.soundsPage?.tricky ?? []).map((word) => word.toLowerCase()));
      const words = [...book.pages.flatMap((page) => page.text.split(/[^A-Za-z']+/)), ...(book.soundsPage?.words ?? [])];
      for (const word of words.filter((w) => w && !tricky.has(w.toLowerCase()))) paths.push(...(blendParts(word) ?? []).map((part) => part.file));
    }
    for (const rel of paths) {
      media.add(rel);
      if (!existsSync(join(source, rel))) problems.push(`${levelDir}/${file}: media file missing in Workbooks: ${rel}`);
    }
  }
}

writeFileSync(
  join(target, "weeks.ts"),
  `/** The Storytime weeks received from Workbooks by scripts/storytime/receive-weeks.ts (do not edit by hand). */\n` +
    `export const STORYTIME_WEEKS: Readonly<Record<string, () => Promise<unknown>>> = {\n${index.join("\n")}\n};\n`,
);
console.log(`received ${index.length} weeks into ${target}; ${media.size} media files in published weeks`);
for (const p of problems) console.log(`PROBLEM ${p}`);
if (media.size) {
  writeFileSync(join(target, "media-list.txt"), `${[...media].sort().join("\n")}\n`);
  console.log(
    `upload (production bucket, owner go):\n  while read p; do gcloud storage cp --predefined-acl=publicRead --cache-control="public, max-age=3600" ` +
      `"${source}/$p" "gs://primary-app-storage/storytime/$p"; done < ${join(target, "media-list.txt")}`,
  );
}
process.exitCode = problems.length ? 1 : 0;
