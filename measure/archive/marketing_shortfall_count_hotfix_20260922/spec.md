# Specification: Marketing Shortfall Count Hotfix

Track ID: `marketing_shortfall_count_hotfix_20260922`. Type: bug. App: `apps/marketing`.

## Overview

`docs/marketing-ux-refactor-plan.md` section 3.3 item 2 requires the topic
shortfall message to show `actualCount` from the 422 body. The server route
`app/api/video/research-topics/route.ts` returns 422 with
`message: "Topic research produced fewer than five distinct new topics (N found)"`.
The client helper `readBadRequestMessage` in
`app/campaigns/[id]/video/page.tsx` returns the fallback for every status
except 400, so the shortfall count never reaches the user.

## Functional Requirements

- FR-1: When the research-topics call returns 422, the workflow error message must include the server's message (which contains the count).
- FR-2: Behavior for 400, 403, 500, and network failures stays unchanged.

## Acceptance Criteria

- AC-1: A unit test feeds a 422 response with a shortfall body into the message path and asserts the count appears.
- AC-2: Existing marketing tests stay green.

## Out of Scope

- Other apps or other endpoints.
