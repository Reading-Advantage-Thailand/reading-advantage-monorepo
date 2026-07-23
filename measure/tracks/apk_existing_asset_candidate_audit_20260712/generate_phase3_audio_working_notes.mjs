#!/usr/bin/env node
/** Collects direct audio-capable multimodal observations for frozen Phase 3 audio groups. */

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const trackRoot = new URL(".", import.meta.url);
const repositoryRoot = new URL("../../../", trackRoot);
const independentReview = process.argv.includes("--independent-review");
const targetGroupArgument = process.argv.find((argument) =>
  argument.startsWith("--target-group=")
);
const targetGroup = targetGroupArgument?.slice("--target-group=".length) ?? null;
const targetedFollowUp = targetGroup !== null;
const outputUrl = new URL(
  targetedFollowUp
    ? `inspection-working-notes/audio-targeted-follow-up-${targetGroup.replace(/^sha256:/u, "")}.json`
    : independentReview
    ? "inspection-working-notes/audio-multimodal-independent-review.json"
    : "inspection-working-notes/audio-multimodal.json",
  trackRoot,
);
const model = process.env.PHASE3_AUDIO_MODEL ?? (independentReview
  ? process.env.PHASE3_AUDIO_REVIEW_MODEL ?? "google/gemini-3-flash-preview"
  : "google/gemini-2.5-flash");
const endpoint = "https://openrouter.ai/api/v1/chat/completions";
const requiredObservationKeys = [
  "audible_content",
  "content_class",
  "speech_or_language",
  "temporal_coverage",
  "placeholder_risk_observation",
  "corruption_or_clipping",
];

/** Returns the lower-case SHA-256 digest for exact evidence bytes. */
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Removes an optional Markdown fence and parses one strict JSON observation. */
function parseObservation(content) {
  const normalized = content.trim()
    .replace(/^```(?:json)?\s*/u, "")
    .replace(/\s*```$/u, "");
  const observation = JSON.parse(normalized);
  if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
    throw new Error("Audio model observation must be a JSON object");
  }
  for (const key of requiredObservationKeys) {
    if (typeof observation[key] !== "string" || !observation[key].trim()) {
      throw new Error(`Audio model observation is missing ${key}`);
    }
  }
  return observation;
}

/** Loads the configured OpenRouter credential without logging or persisting it. */
async function openRouterCredential() {
  const authPath = process.env.OPENCODE_AUTH_PATH
    ?? join(homedir(), ".local", "share", "opencode", "auth.json");
  const auth = JSON.parse(await readFile(authPath, "utf8"));
  const key = auth?.openrouter?.key;
  if (typeof key !== "string" || !key) {
    throw new Error("OpenRouter credential is unavailable through OpenCode auth");
  }
  return key;
}

/** Returns all frozen audio groups in deterministic batch/hash order. */
async function frozenAudioGroups() {
  const batchesUrl = new URL("batches/", trackRoot);
  const batchNames = (await readdir(batchesUrl))
    .filter((name) => /^AF-\d{2}$/u.test(name))
    .sort();
  const groups = [];
  for (const batchId of batchNames) {
    const manifest = JSON.parse(await readFile(
      new URL(`${batchId}/inspection-source-manifest.json`, batchesUrl),
      "utf8",
    ));
    for (const group of manifest.groups) {
      if (group.media_class === "audio") {
        groups.push({ batchId, group });
      }
    }
  }
  if (groups.length !== 14) {
    throw new Error(`Expected 14 frozen audio groups, found ${groups.length}`);
  }
  return groups;
}

/** Sends one exact frozen audio file to the audio-capable multimodal model. */
async function inspectAudio(apiKey, batchId, group) {
  const source = group.inspection_source;
  const audioUrl = new URL(source.canonical_path, repositoryRoot);
  const bytes = await readFile(audioUrl);
  if (sha256(bytes) !== group.sha256) {
    throw new Error(`${group.identical_hash_group} checked-out audio differs from frozen bytes`);
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Listen directly to the attached audio bytes.",
              "Do not infer from a filename or intended game use.",
              "Return only one compact JSON object with non-empty string keys:",
              requiredObservationKeys.join(", "),
              "For content_class use vocalization, speech, music, ambient, sound_effect, mixed, or unclear.",
              "Report only what is audible and preserve uncertainty.",
            ].join(" "),
          },
          {
            type: "input_audio",
            input_audio: {
              data: bytes.toString("base64"),
              format: source.canonical_path.slice(source.canonical_path.lastIndexOf(".") + 1),
            },
          },
        ],
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "phase3_audio_observation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ...Object.fromEntries(
                requiredObservationKeys.map((key) => [key, { type: "string" }]),
              ),
              content_class: {
                type: "string",
                enum: [
                  "vocalization",
                  "speech",
                  "music",
                  "ambient",
                  "sound_effect",
                  "mixed",
                  "unclear",
                ],
              },
            },
            required: requiredObservationKeys,
            additionalProperties: false,
          },
        },
      },
      temperature: 0,
      max_tokens: 700,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter ${response.status} for ${group.identical_hash_group}: ${body}`);
  }
  const payload = JSON.parse(body);
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`OpenRouter returned no text observation for ${group.identical_hash_group}`);
  }
  return {
    batch_id: batchId,
    identical_hash_group: group.identical_hash_group,
    inspection_source: source,
    evidence_kind: "direct_audio_multimodal",
    model,
    provider_response_id: payload.id,
    observation: parseObservation(content),
    usage: payload.usage ?? null,
    limitation: "Single model pass over exact frozen audio bytes; no runtime mixing, loudness normalization, loop-boundary, or gameplay suitability claim.",
  };
}

if (!process.argv.includes("--execute")) {
  const groups = (await frozenAudioGroups()).filter(
    ({ group }) => targetGroup === null || group.identical_hash_group === targetGroup,
  );
  if (targetedFollowUp && groups.length !== 1) {
    throw new Error(`Target group must resolve exactly once, found ${groups.length}`);
  }
  process.stdout.write(`DRY_RUN: ${groups.length} frozen audio groups ready; pass --execute to call ${model}\n`);
  process.exit(0);
}

const apiKey = await openRouterCredential();
const records = [];
const selectedGroups = (await frozenAudioGroups()).filter(
  ({ group }) => targetGroup === null || group.identical_hash_group === targetGroup,
);
if (targetedFollowUp && selectedGroups.length !== 1) {
  throw new Error(`Target group must resolve exactly once, found ${selectedGroups.length}`);
}
for (const { batchId, group } of selectedGroups) {
  records.push(await inspectAudio(apiKey, batchId, group));
  process.stdout.write(`Inspected ${records.length}/${selectedGroups.length} frozen audio groups\n`);
}
const document = {
  schema_version: targetedFollowUp
    ? "apk-asset-forensics.phase3-audio-targeted-follow-up.v1"
    : independentReview
    ? "apk-asset-forensics.phase3-audio-independent-review.v1"
    : "apk-asset-forensics.phase3-audio-working-notes.v1",
  track_id: "apk_existing_asset_candidate_audit_20260712",
  evidence_boundary: targetedFollowUp
    ? "Targeted direct-audio conflict resolution only; no disposition, suitability decision, or Phase 3 acceptance."
    : independentReview
    ? "Independent direct-audio review only; no disposition, suitability decision, or Phase 3 acceptance."
    : "Non-decisional direct-audio observations only; not an inspection record, disposition, suitability decision, or Phase 3 acceptance.",
  provider: {
    endpoint,
    model,
    audio_capable_multimodal: true,
  },
  records,
};
await writeFile(outputUrl, `${JSON.stringify(document, null, 2)}\n`);
process.stdout.write(`Wrote ${records.length} direct audio observations to ${outputUrl.pathname}\n`);
