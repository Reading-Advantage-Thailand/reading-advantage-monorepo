# www CRM Lead Intake

## Overview

Turn every approved `www-reading-advantage` commercial inquiry into a durable,
attributable CRM lead with reliable user feedback and operator notification.
Replace the Contact Us `mailto:` behavior and no-op commercial forms with one
reusable localized intake flow backed by the accepted company-operations lead
capability.

## Stories

### Story S1: Capture qualified inquiries
**As a** prospective school or partner
**I want** Contact Us to submit reliably without opening my email client
**So that** Reading Advantage can respond to my inquiry

**Acceptance Criteria:**
- Given valid business-contact data, When the form submits, Then the CRM stores one validated lead with product, intent, source page, locale, referrer, UTM/campaign, and consent provenance.
- Given invalid, oversized, automated, or rate-limited input, When it submits, Then the request fails safely without creating a lead or revealing internal details.
- Given success or failure, When the response returns, Then localized accessible UI communicates the result and prevents accidental duplicate clicks.
- Given public intake, When logs/audits are inspected, Then message content and personal information are not emitted unnecessarily.

**Estimate:** M
**Priority:** Must

### Story S2: Unify commercial CTAs
**As a** prospective customer
**I want** relevant CTAs to open the same inquiry experience with useful context preselected
**So that** I do not repeat information and the company understands my intent

**Acceptance Criteria:**
- Given Contact Us, Request a Demo, School Pricing, Talk to Us, or an approved waitlist CTA, When selected, Then it reaches the shared form with product and inquiry intent preselected where known.
- Given localized navigation, When the form opens, Then locale and translated labels are preserved.
- Given a non-commercial CTA, When reviewed, Then it is not forced into CRM intake without an explicit product decision.
- Given CTA inventory, When a new commercial CTA is added without an approved mapping, Then a test/guard identifies the missing attribution contract.

**Estimate:** M
**Priority:** Must

### Story S3: Verify delivery and operations
**As a** company operator
**I want** notification and end-to-end evidence for lead intake
**So that** inquiries are noticed and deployment failures do not silently lose leads

**Acceptance Criteria:**
- Given a new accepted lead, When intake commits, Then a notification adapter sends a secret-safe summary and notification failure does not delete the lead.
- Given notification failure, When delivery state is inspected, Then the lead retains a correlated pending/failed outcome and bounded retry or explicit operator retry can recover delivery.
- Given likely duplicate submissions, When deduplication applies, Then the operator can still see submission history and source attribution.
- Given the production website, When a browser submits each representative CTA flow, Then the resulting CRM lead and notification evidence can be correlated.
- Given an accepted or rejected submission, When analytics is emitted, Then a privacy-safe conversion event records outcome, product, intent, locale, and source without message text or unnecessary personal data.
- Given the currently unreliable www deployment path, When release begins, Then deployment authority and a successful current-source deployment are proven before acceptance.

**Estimate:** S
**Priority:** Must

## Non-Functional Requirements

- The public website route is thin and never imports the operations database.
- Use the internal notification adapter; do not couple the domain to an email
  provider.
- Apply rate limiting plus a low-friction spam control such as a honeypot before
  introducing interactive captcha.
- Preserve current accessibility, mobile, and localization requirements.
- Record only business inquiry data needed for follow-up and document retention.

## Track-Level Acceptance Criteria

- Contact Us no longer uses `mailto:` and every approved commercial CTA has an
  explicit CRM intent mapping.
- Valid leads are durable even when notification delivery fails.
- Notification delivery state is durable, visible, correlated, and recoverable.
- Invalid/spam/rate-limited requests create no lead.
- Production browser evidence correlates website submission, CRM record, and
  operator notification.
- Consent-aware analytics preserves the Wave 5 T1 conversion-measurement
  obligation without duplicating CRM records.

## Out of Scope

- Newsletter marketing, automated nurture campaigns, bulk email, or lead scoring.
- Changing unapproved product claims, pricing figures, or legal copy.
- CRM customer conversion, trials, subscriptions, or product provisioning,
  which belong to `customer_licensing_crm_20260722`.
