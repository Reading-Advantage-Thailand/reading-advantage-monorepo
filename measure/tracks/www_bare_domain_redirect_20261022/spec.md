# www bare-domain redirect to 0.0.0.0

## Overview

The live site `https://www.reading-advantage.com/` returns `307 Location: https://0.0.0.0/en`.
The prefixed URLs `/en`, `/th`, and `/zh` serve correctly.

## Cause

next-intl builds its locale redirect from `request.url`. In the Cloud Run container,
`request.url` carries the bind address `0.0.0.0:8080`, not the public host. The proxy
stripped `:8080` from the Location header but kept the host.

## Stories

### Story S1: Bare domain redirects to the public locale URL
**As a** visitor
**I want** `www.reading-advantage.com` to open the English home page
**So that** the site works without a language prefix

**Acceptance Criteria:**
- Given a request to `/` with a public `host` header, When the proxy redirects, Then the Location header uses the public host and the forwarded protocol.
- Given a request with `x-forwarded-host`, When the proxy redirects, Then that host wins over `host`.
- Given a request without a host header, When the proxy redirects, Then the Location header stays unchanged.
- Given a prefixed locale path, When the proxy runs, Then no redirect occurs.

**Estimate:** S
**Priority:** Must
