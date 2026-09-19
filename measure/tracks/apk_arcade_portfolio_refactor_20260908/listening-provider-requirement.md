> Superseded by the owner correction: show a Thai target and require an English answer.
> The previous English-prompt listening mode is unavailable in the hosts.
> This document records the previous implementation and does not define current acceptance.

# Wizard listening provider requirement

## Current boundary

The authenticated Wizard endpoint now supports the Thai Listen to Select pilot.
The endpoint loads authorized student vocabulary before it resolves speech.
It keeps each educational item limited to `term` and `translation`.
It returns speech references beside the educational array.

Requests for English, Chinese, Traditional Chinese, or Vietnamese answer translations return `LISTENING_UNAVAILABLE`.
The supported pilot uses English audio prompts and Thai answer translations.
This rule prevents the legacy `cn` and `tw` codes from becoming false speech locales.

## Required configuration

Each host needs the standard internal storage variables:

- `STORAGE_ENDPOINT`
- `STORAGE_REGION`
- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY`
- `STORAGE_SECRET_KEY`

Each host also needs `APK_WIZARD_SPEECH_MANIFEST`.
The manifest must use this shape:

```json
{
  "schemaVersion": 1,
  "clips": [
    {
      "text": "river",
      "sourceLocale": "en-US",
      "key": "apk/speech/en-US/river.mp3",
      "mediaType": "audio/mpeg"
    }
  ]
}
```

Each term and source locale pair must be unique.
The resolver uses exact text and locale matches.
The resolver never derives a storage key from student content.
The storage adapter checks each configured object before it signs a URL.
The 5,000 millisecond deadline covers the complete deck preparation.

## Remaining provider work

The repository does not contain the required student term recordings.
This change does not provision the manifest or the storage variables in a deployment.
The public preview uses MMX recordings for four sample terms.
Production recording generation, pronunciation review, storage upload, and deployment configuration remain pending.

A missing manifest, object, term, or locale returns `LISTENING_UNAVAILABLE`.
The host must show the explicit Read action after this response.
The host must not start a reading session as listening evidence.
