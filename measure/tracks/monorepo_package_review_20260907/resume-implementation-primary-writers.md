# Primary writer implementation

Date: 2026-09-07

## Result

Article writers store the generated passage in the required content field.

Multiple-choice writers store the correct option index. They reject unmatched answers before the first database write.

Article approval rejects missing type, CEFR, passage, summary, or image description fields before generation.

The test actions reject missing passage and image fields. The audio generator derives sentences from a validated passage when necessary.

Article assignments store the required `ARTICLE` type.

The standalone route identifies a lesson by its article ID. The assigned route identifies a lesson by its assignment ID.

These identities permit one standalone attempt and multiple assigned attempts for the same article. They satisfy the unique user and lesson constraint.

An initial 100 percent assignment update now completes both progress records. It stores the completion time on each record.

Student queries reject a missing school identifier before each school-scoped query.

Student, teacher, and signup writers store generated IDs, normalized usernames, submitted display usernames, and uppercase roles.

Teacher results convert classroom grades to strings. Teacher school conflicts reject a missing school or school name.

Feedback and sentence translation reject missing CEFR data. Feedback also rejects a missing passage.

The image generator uses only supported internal AI adapter functions. The story generator uses `maxOutputTokens`.

The review named `server/utils/generators/audio-generator.ts`. That path does not exist.

The active file is `server/utils/genaretors/audio-generator.ts`. It has no active FFmpeg imports.

## Behavior validation

Run from `apps/primary-advantage`:

```bash
CI=true node ../../node_modules/vitest/vitest.mjs run server/models/__tests__/writerModels.behavior.test.ts server/models/__tests__/siblingModels.behavior.test.ts server/__tests__/writer-contracts.test.ts --pool=threads --maxWorkers=1 --no-file-parallelism
```

Result: exit 0. Three files and eight tests passed.

The tests invoke article creation against PGlite. They verify the passage field and numeric answer index.

The invalid-answer test verifies zero article writes. The user test verifies stored identity fields and the assigned role.

The progress test creates standalone and assigned progress for the same article. It verifies three distinct rows under the database constraint.

The progress test also verifies immediate completion. The teacher test uses the required `SchoolAdmins` authorization relationship.

The remaining static test checks only the internal AI adapter boundary and its supported token option.

## Full type check

Run from `apps/primary-advantage`:

```bash
node ../../node_modules/typescript/bin/tsc --noEmit --pretty false
```

Result: exit 0 with no diagnostics after the auth client rebuild.

The final declaration check required named generator response contracts. The leaderboard data contracts also required exported names.

## Changed files

- `apps/primary-advantage/actions/test.ts`
- `apps/primary-advantage/server/__tests__/writer-contracts.test.ts`
- `apps/primary-advantage/server/models/__tests__/helpers/testDb.ts`
- `apps/primary-advantage/server/models/__tests__/siblingModels.behavior.test.ts`
- `apps/primary-advantage/server/models/__tests__/writerModels.behavior.test.ts`
- `apps/primary-advantage/server/models/articleModel.ts`
- `apps/primary-advantage/server/models/assignmentModel.ts`
- `apps/primary-advantage/server/models/lessonModel.ts`
- `apps/primary-advantage/server/models/schoolModel.ts`
- `apps/primary-advantage/server/models/studentModel.ts`
- `apps/primary-advantage/server/models/teacherModel.ts`
- `apps/primary-advantage/server/models/userModel.ts`
- `apps/primary-advantage/server/utils/assistant.ts`
- `apps/primary-advantage/server/utils/genaretors/audio-generator.ts`
- `apps/primary-advantage/server/utils/genaretors/image-generator.ts`
- `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts`
- `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts`
- `apps/primary-advantage/server/utils/genaretors/sa-question-generator.ts`
- `apps/primary-advantage/server/utils/genaretors/sentence-translator.ts`
- `apps/primary-advantage/server/utils/genaretors/story-generator.ts`

Root must update `graph.db` for these structural edits.

## Fixed review diagnostics

- `actions/test.ts`: nullable passage, missing sentences, and image description shape.
- `server/models/articleModel.ts`: required content, numeric correct answers, and nullable generation fields.
- `server/models/assignmentModel.ts`: assignment type, assigned progress identity, and initial completion state.
- `server/models/lessonModel.ts`: standalone progress identity.
- `server/models/studentModel.ts`: missing tenant identifiers and required user identity fields.
- `server/models/teacherModel.ts`: nullable school data, numeric grades, and required user identity fields.
- `server/models/userModel.ts`: required user identity fields.
- `server/utils/assistant.ts`: nullable CEFR and passage fields.
- `server/utils/genaretors/image-generator.ts`: unsupported adapter exports.
- `server/utils/genaretors/sentence-translator.ts`: nullable CEFR input.
- `server/utils/genaretors/story-generator.ts`: obsolete output-token option.
