// @vitest-environment node
/**
 * Task 1.7: the app icon that ends the console 404 (AC-1.8; plan 1.7).
 *
 * The unit test reads the 8-byte PNG signature and the IHDR size fields with `node:fs`; it needs
 * no server and adds no hash. Four broken copies must be rejected. Case I3 is the named
 * characterization: `/icon.png` of a stranger keeps passing the proxy, so the login track cannot
 * send the icon to the sign-in page.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

const app = resolve(import.meta.dirname, "..");
const iconPath = resolve(app, "app/icon.png");

/** The 8-byte PNG file signature. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The 12-byte IEND chunk. */
const IEND = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

/** The largest accepted icon file, in bytes. */
const MAX_BYTES = 20 * 1024;

/** The smallest accepted icon side, in pixels. */
const MIN_SIDE = 32;

/** The result of one icon check. */
interface IconCheck {
  /** Whether the buffer is an accepted icon. */
  ok: boolean;
  /** The width from the IHDR chunk, or 0 when it cannot be read. */
  width: number;
  /** The height from the IHDR chunk, or 0 when it cannot be read. */
  height: number;
  /** The buffer size in bytes. */
  bytes: number;
  /** The first failed requirement, or an empty string when the buffer passes. */
  reason: string;
}

/**
 * Checks one buffer against the icon contract.
 * @param buffer The candidate icon.
 * @returns The check result, with the size fields and the first failed requirement.
 */
function checkIcon(buffer: Buffer): IconCheck {
  const bytes = buffer.length;
  if (bytes < 33) return { ok: false, width: 0, height: 0, bytes, reason: "too short" };
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { ok: false, width: 0, height: 0, bytes, reason: "not a PNG signature" };
  }
  if (buffer.subarray(12, 16).toString("latin1") !== "IHDR") {
    return { ok: false, width: 0, height: 0, bytes, reason: "missing IHDR" };
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width < MIN_SIDE || height < MIN_SIDE) {
    return { ok: false, width, height, bytes, reason: "smaller than 32 by 32 pixels" };
  }
  if (bytes > MAX_BYTES) {
    return { ok: false, width, height, bytes, reason: "larger than 20 KB" };
  }
  if (!buffer.subarray(-12, -8).equals(Buffer.from([0, 0, 0, 0])) || !buffer.subarray(-8, -4).equals(Buffer.from("IEND", "latin1"))) {
    return { ok: false, width, height, bytes, reason: "truncated before IEND" };
  }
  return { ok: true, width, height, bytes, reason: "" };
}

/**
 * Builds a structurally valid PNG header with an IEND end.
 * @param width The IHDR width.
 * @param height The IHDR height.
 * @param padding Extra bytes between IHDR and IEND.
 * @returns The buffer.
 */
function pngBuffer(width: number, height: number, padding = 0): Buffer {
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "latin1");
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8;
  ihdr[17] = 6;
  return Buffer.concat([PNG_SIGNATURE, ihdr, Buffer.alloc(padding), IEND]);
}

/** Builds one request for the proxy. */
function request(path: string): NextRequest {
  return new NextRequest(new URL(path, "https://app.example"));
}

describe("Task 1.7 app icon (AC-1.8)", () => {
  it("ships a 32 by 32 PNG of 20 KB or less and rejects four broken copies", () => {
    expect(existsSync(iconPath), "Missing apps/storytime/app/icon.png").toBe(true);
    const buffer = readFileSync(iconPath);
    const check = checkIcon(buffer);
    expect(
      check.ok,
      `the app icon must pass the PNG contract: icon_w=${check.width} icon_h=${check.height} icon_bytes=${check.bytes} reason=${check.reason}`,
    ).toBe(true);
    expect(check.width, "icon_w must be 32 or more").toBeGreaterThanOrEqual(MIN_SIDE);
    expect(check.height, "icon_h must be 32 or more").toBeGreaterThanOrEqual(MIN_SIDE);
    expect(check.bytes, "icon_bytes must be 20480 or less").toBeLessThanOrEqual(MAX_BYTES);
    expect(`icon_w=${check.width} icon_h=${check.height} icon_bytes=${check.bytes}`).toMatch(
      /^icon_w=\d+ icon_h=\d+ icon_bytes=\d+$/,
    );

    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const small = pngBuffer(16, 16);
    const large = pngBuffer(32, 32, 21_000);
    const truncated = pngBuffer(32, 32).subarray(0, pngBuffer(32, 32).length - 12);
    const copies: Array<{ label: string; buffer: Buffer }> = [
      { label: "JPEG header", buffer: jpeg },
      { label: "16 by 16 PNG", buffer: small },
      { label: "21 KB PNG", buffer: large },
      { label: "PNG cut before IEND", buffer: truncated },
    ];
    expect(copies.length, "broken_copies must stay at four").toBe(4);
    for (const copy of copies) {
      const broken = checkIcon(copy.buffer);
      expect(broken.ok, `${copy.label} must be rejected (reason=${broken.reason})`).toBe(false);
      expect(broken.reason, `${copy.label} must name its failed requirement`).not.toBe("");
    }
    // The checker must accept a good buffer, or the four rejections are vacuous.
    expect(checkIcon(pngBuffer(32, 32)).ok, "a 32 by 32 PNG must pass").toBe(true);
  });

  it("keeps /icon.png out of the sign-in redirect for a stranger", async () => {
    // Named characterization (fact M10): the proxy passes a file path before any rule.
    const response = request("/icon.png");
    const proxy = (await import("../proxy")).default;
    const answer = proxy(response);
    const location = answer.headers.get("location");
    expect(answer.status, "/icon.png of a stranger must not redirect").not.toBe(307);
    expect(location ?? "", "/icon.png of a stranger must not go to sign-in").not.toContain("sign-in");
  });
});
