// Stages the help videos for the bucket (track primary_in_app_help_20261023, spec FR-8; runbook
// docs/runbooks/help-video-sync.md). Reads the registry and PR's What's New folder, checks each
// enabled video (file, poster, moov first, H.264 + AAC, length), links the files into
// <out>/help/whats-new/<id>.mp4 and <id>.jpg, and writes lib/help/youtube-ids.json. It uploads nothing.
//   pnpm tsx scripts/help/stage-help-videos.ts --out <dir> [--pr ~/Desktop/advantage-pr]
import { spawnSync } from "node:child_process";
import { copyFileSync, linkSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, closeSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { HELP_VIDEOS } from "../../lib/help/videos";
import { moovFirst, videoFileFor, youtubeIds } from "./stage-lib";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const out = arg("--out");
if (!out) throw new Error("--out <dir> is required");
const pr = arg("--pr") ?? join(homedir(), "Desktop/advantage-pr");
const root = join(pr, "assets/videos/primary-whats-new");
const files = readdirSync(root).filter((d) => d.startsWith("wave")).flatMap((d) => readdirSync(join(root, d)).map((f) => `${d}/${f}`));
const links = JSON.parse(readFileSync(join(pr, "assets/video-assets/plans/primary-whats-new-youtube-links.json"), "utf8"));
const target = join(out, "help/whats-new");
mkdirSync(target, { recursive: true });

/** Links a file into the stage folder; copies it when a hard link is not possible. */
const place = (from: string, to: string) => {
  if (existsSync(to)) rmSync(to);
  try { linkSync(from, to); } catch { copyFileSync(from, to); }
};

const problems: string[] = [];
const enabled = HELP_VIDEOS.filter((v) => v.enabled);
for (const video of enabled) {
  const file = videoFileFor(video.id, files);
  if (!file) { problems.push(`${video.id}: no mp4 file`); continue; }
  const mp4 = join(root, file);
  const jpg = mp4.replace(/\.mp4$/, ".jpg");
  if (!existsSync(jpg)) problems.push(`${video.id}: no poster ${file.replace(/\.mp4$/, ".jpg")}`);
  const head = Buffer.alloc(65536);
  const fd = openSync(mp4, "r");
  readSync(fd, head, 0, head.length, 0);
  closeSync(fd);
  if (moovFirst(head) !== true) problems.push(`${video.id}: moov is not before mdat (re-mux with ffmpeg -c copy -movflags +faststart)`);
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name:format=duration", "-of", "json", mp4], { encoding: "utf8" });
  const info = JSON.parse(probe.stdout || "{}") as { streams?: { codec_name: string }[]; format?: { duration: string } };
  const codecs = (info.streams ?? []).map((s) => s.codec_name).sort().join("+");
  if (codecs !== "aac+h264") problems.push(`${video.id}: codecs ${codecs || "unknown"}, expected aac+h264`);
  const seconds = Math.round(Number(info.format?.duration ?? 0));
  if (Math.abs(seconds - video.durationSec) > 2) problems.push(`${video.id}: ${seconds} s, the registry says ${video.durationSec} s (a new take? update the registry)`);
  place(mp4, join(target, `${video.id}.mp4`));
  if (existsSync(jpg)) place(jpg, join(target, `${video.id}.jpg`));
}

const ids = youtubeIds(links, enabled.map((v) => v.id));
writeFileSync(new URL("../../lib/help/youtube-ids.json", import.meta.url), `${JSON.stringify(ids, null, 2)}\n`);
console.log(`staged ${enabled.length} videos in ${target}; ${Object.keys(ids).length} are on YouTube (lib/help/youtube-ids.json)`);
for (const p of problems) console.log(`PROBLEM ${p}`);
console.log(`upload (production bucket, owner go):\n  gcloud storage rsync ${target} gs://primary-app-storage/help/whats-new --predefined-acl=publicRead --cache-control="public, max-age=3600"`);
process.exitCode = problems.length ? 1 : 0;
