# Implementation Plan: www CRM Lead Intake

## Dependencies and Preconditions

- Depends on accepted lead/intake contracts from
  `customer_licensing_crm_20260722` Phase S1.
- Owns Wave 5 T1 lead capture only; reconcile its evidence with Wave 5 and do
  not absorb unrelated SEO, i18n, accessibility, pricing, legal, marketing, or
  Science scope.
- Verify and repair the authoritative www deployment path before production
  acceptance.
- Notification outbox processing depends on `durable_job_worker_platform_20260713` Phase 4 acceptance; no www-local queue or request-path retry loop is allowed.

## Phase S1: Capture qualified inquiries
_Story ref: spec.md#story-s1_

- [b] Task: Inventory current Contact Us/waitlist inputs and define strict public lead, consent, attribution, rate-limit, spam, and safe-response contracts. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Write Red route/component tests for success, validation, oversize, honeypot, throttling, duplicate clicks, adapter failure, and privacy-safe logs. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Implement the thin public lead route and replace Contact Us `mailto:` submission with accessible localized async UX. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Run www/backend targeted tests, accessibility checks, graph update, generated docs, and doctor gates. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S1: Capture qualified inquiries' (Protocol in workflow.md) (deferred:customer_licensing_crm_20260722-s1-acceptance)

## Phase S2: Unify commercial CTAs
_Story ref: spec.md#story-s2_

- [b] Task: Publish an exact commercial CTA inventory and mapping for product, intent, locale, source page, and campaign values. (deferred:www_crm_lead_intake_20260722-s1-acceptance)
- [b] Task: Write Red navigation/component/guard tests for representative CTA mappings and an unmapped counterexample. (deferred:www_crm_lead_intake_20260722-s1-acceptance)
- [b] Task: Route approved Contact, Demo, Pricing, Talk, and waitlist CTAs through the shared intake experience without changing claims. (deferred:www_crm_lead_intake_20260722-s1-acceptance)
- [b] Task: Run responsive multilingual browser tests plus affected lint/type/test/build gates and update generated route facts. (deferred:www_crm_lead_intake_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S2: Unify commercial CTAs' (Protocol in workflow.md) (deferred:www_crm_lead_intake_20260722-s1-acceptance)

## Phase S3: Verify delivery and operations
_Story ref: spec.md#story-s3_

- [b] Task: Define notification payload, persisted delivery state, bounded/job retry or operator retry, correlation, privacy-safe analytics, retention, and production smoke evidence contracts. (deferred:www_crm_lead_intake_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Write Red tests proving lead durability is independent of notification success, failed delivery is visible/recoverable, analytics excludes message/PII, and live tests require explicit opt-in. (deferred:www_crm_lead_intake_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Implement the notification job/outbox adapter invocation, analytics event, retry action, and Company Admin correlation projection needed for acceptance. (deferred:www_crm_lead_intake_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Repair/confirm www deployment authority, deploy exact source, run CTA-to-CRM browser acceptance, reconcile Wave 5 T1, and close Critical/High findings. (deferred:www_crm_lead_intake_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S3: Verify delivery and operations' (Protocol in workflow.md) (deferred:www_crm_lead_intake_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
