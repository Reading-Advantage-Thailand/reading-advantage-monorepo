# English answer audio preparation

## Status

The offline utility prepares English answer audio from an explicit JSON file.
It does not read or export student data.
It does not prepare Thai prompts.
This change generated no audio and uploaded no files.

The utility emits a draft manifest for review.
The draft does not mark pronunciation as approved.
An operator must review each clip before upload and runtime configuration.

## Fixed settings

The public preview README defines these settings:

- Voice: `English_expressive_narrator`
- Model: `speech-2.8-hd`
- Speed: `0.9`
- Language: `English`
- Format: `mp3`
- Source locale: `en-US`

The MMX adapter passes each value as a separate process argument.
It disables shell parsing and uses a 90 second limit for each term.
The batch processes terms in sequence and accepts at most 50 items.

## Input and duplicate policy

The input must be a JSON array of strict vocabulary items.
Each item contains only `term` and `translation`.
The utility synthesizes the English `term` value.
The translation remains input context and does not enter the audio.

The utility rejects an empty array, unknown fields, untrimmed terms, and terms longer than 200 characters.
It collapses exact duplicate terms and keeps the first position.
Case, punctuation, and accent differences remain separate terms.

Filenames use a stable index and a readable term segment.
For example, `000-river.mp3` is the first unique term.
The index prevents collisions between equal filename segments.
The utility does not add hashes.

## Resume and audio validation

Each completed clip has an adjacent `.identity.json` file.
The identity records the exact term, filename, locale, voice, model, speed, language, and format.
Resume requires an exact identity match.
Changed or reordered terms cause regeneration, including terms with equal filename segments.

FFmpeg decodes one audio frame before completion or reuse.
The adapter uses `-xerror` and separate process arguments.
Empty output, invalid audio, and decoder failures reject the clip.
The utility reports a missing FFmpeg executable explicitly.

The provider writes to a `.partial` path.
The utility validates that path before an atomic rename.
It then writes the identity through a separate partial file.
A failed generation cannot create a completed clip or draft manifest.

## Command

Review the explicit input file before running this command:

```bash
pnpm --filter @reading-advantage/domain run prepare:english-answer-speech -- \
  --input ../../measure/tracks/apk_arcade_portfolio_refactor_20260908/speech-review-input.json \
  --output-dir ../../.tmp/english-answer-speech-review \
  --storage-prefix apk/speech/en-US
```

The command writes `english-answer-speech-manifest.draft.json` in the output directory.
Its clip entries match the existing configured speech resolver shape:

```json
{
  "schemaVersion": 1,
  "clips": [
    {
      "text": "river",
      "sourceLocale": "en-US",
      "key": "apk/speech/en-US/000-river.mp3",
      "mediaType": "audio/mpeg"
    }
  ]
}
```

This command requires a configured `mmx` CLI and FFmpeg.
The command does not upload the output.
The storage keys describe a later reviewed upload.

## Read to Select Audio correction packet

Wizard must show a written Thai target and offer English audio answers.
The existing vocabulary ABI remains `{ term: English, translation: Thai }`.
The existing `listen-to-select` contract remains available for other games.

Add a separate `read-to-select-audio` session contract.
Use `promptLocale: "th-TH"` and `answerLocale: "en-US"`.
Set `promptField: "translation"` and `answerField: "term"`.
These fields make the learning direction explicit.

Prepare one English clip for each content position.
Each choice references that content position.
The question displays the current Thai translation.
Each choice plays its English term without displaying that term before confirmation.

The game can confirm an answer only after the selected clip reaches its playback end event.
A play request or a failed playback cannot confirm an answer.
Replay remains available before confirmation.

New evidence must keep question positions separate from clip positions.
Each selection record needs `questionPosition`, `promptItemPosition`, and `clipItemPosition`.
It also needs a completed, failed, or cancelled playback result.
The confirmed selection must reference a completed playback record.

Bound every position by the current content length.
Reject duplicate question records and invalid clip positions.
Record replay counts and audio failures with both question and clip positions.
Keep transcript assistance outside this mode because the Thai target is already visible.

The authenticated hosts should keep this mode unavailable until every answer clip exists.
Missing clips must return the explicit unavailable response.
The game must continue to offer the separate reading action.

## Remaining work

Select a small English answer batch for pronunciation review.
Review every generated clip for word identity, clarity, and acceptable pronunciation.
Upload only approved clips through the existing storage process.
Configure the reviewed manifest after the objects exist.

Implement the new contract, controller behavior, host adapter, and evidence tests in a separate bounded change.
The current four English preview files support only the public preview terms.
They do not cover student-selected answer sets.
