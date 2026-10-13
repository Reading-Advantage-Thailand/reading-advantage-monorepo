/**
 * The company contact channels of the public pages (spec PP-3). The values come from the PR
 * session's single source `advantage-pr/01-company/contact-and-locations.md` (v2.1, 2026-10-07);
 * the labels are in the message files.
 */
export const CONTACT_CHANNELS = {
  line: { href: "https://line.me/ti/p/Pf7_EF98Pv", text: "ReadingAdvantage", qr: "/landing/line-qr.webp" },
  facebook: { href: "https://www.facebook.com/readingadvantage", text: "facebook.com/readingadvantage" },
  phone: { href: "tel:+66990058038", text: "+66 099-005-8038" },
  email: { href: "mailto:support@reading-advantage.com", text: "support@reading-advantage.com" },
} as const;

/** A contact channel key. */
export type ContactChannel = keyof typeof CONTACT_CHANNELS;
