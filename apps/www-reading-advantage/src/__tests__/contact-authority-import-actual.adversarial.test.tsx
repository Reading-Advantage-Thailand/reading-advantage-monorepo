/**
 * Adversarial probes for the contact-authority duplicate check (F1 hold).
 * The render checks of phase-4-contact-authority.red.test.tsx run against a
 * mocked contact config. These probes pin the two facts that keep the
 * duplicate check honest: vi.importActual returns the shipped config, not
 * the mock, and no shipped raw value sits in an unscanned locale leaf.
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/config/contact", () => ({
  contactDetails: {
    supportEmail: "authority@example.test",
    phoneNumber: "+66 000-111-2222",
    phoneHref: "tel:+660001112222",
    tiktokUrl: "https://www.tiktok.com/@authority.test",
    tiktokLabel: "@authority.test",
    lineQrSrc: "/line-qr-authority.jpg",
    lineQrAlt: "Authority Line QR",
  },
}));

import { contactDetails } from "@/config/contact";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";

type Dict = Record<string, unknown>;

/** The three locale paths the duplicate check scans. */
const SCANNED_PATHS = [
  "pages.contact.email.address",
  "pages.contact.phone.number",
  "pages.contact.social.tiktok",
];

/** Reads the shipped config through vi.importActual, as the target test does. */
async function shippedContactDetails(): Promise<typeof contactDetails> {
  const actual = await vi.importActual<typeof import("@/config/contact")>(
    "@/config/contact",
  );
  return actual.contactDetails;
}

/** Lists string leaves with their dotted paths. */
function leaves(
  value: unknown,
  path = "",
  out: Array<{ path: string; text: string }> = [],
): Array<{ path: string; text: string }> {
  if (typeof value === "string") {
    out.push({ path: path || "(root)", text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) =>
      leaves(item, path ? `${path}.${index}` : String(index), out),
    );
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Dict)) {
      leaves(child, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

describe("contact authority duplicate-check probes", () => {
  it("importActual returns the shipped config, not the mock", async () => {
    const shipped = await shippedContactDetails();
    expect(shipped.supportEmail).not.toBe(contactDetails.supportEmail);
    expect(shipped.supportEmail).toBe("support@reading-advantage.com");
    expect(shipped.phoneNumber).toBe("+66 099-005-8038");
    expect(shipped.tiktokUrl).toBe(
      "https://www.tiktok.com/@reading.advantage",
    );
  });

  it("finds no shipped raw value in an unscanned locale leaf", async () => {
    const shipped = await shippedContactDetails();
    const handle = new URL(shipped.tiktokUrl).pathname.slice(1);
    const values = [shipped.supportEmail, shipped.phoneNumber, handle];
    const hits: string[] = [];
    for (const [name, messages] of [
      ["en", enMessages],
      ["th", thMessages],
      ["zh", zhMessages],
    ] as const) {
      for (const leaf of leaves(messages as unknown as Dict)) {
        for (const value of values) {
          if (value && leaf.text.includes(value)) {
            hits.push(`${name} ${leaf.path}`);
          }
        }
      }
    }
    const unscanned = hits.filter(
      (hit) => !SCANNED_PATHS.some((path) => hit.endsWith(path)),
    );
    expect(
      unscanned,
      `raw contact values outside scanned paths: ${unscanned.join(", ")}`,
    ).toEqual([]);
  });

  it("ships no empty config value, so an empty config fails loudly", async () => {
    const shipped = await shippedContactDetails();
    for (const [name, value] of Object.entries(shipped)) {
      expect(typeof value, name).toBe("string");
      expect((value as string).trim().length, name).toBeGreaterThan(0);
    }
  });
});
