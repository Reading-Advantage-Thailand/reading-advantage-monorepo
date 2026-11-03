// @vitest-environment node
/** CSV temp file cleanup on a real temp folder: one file, old files, and the error answers. */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));

import { DELETE, POST } from "../route";

const DAY = 24 * 60 * 60 * 1000;
let root: string;
let temp: string;

/**
 * Builds a cleanup request for a file name.
 * @param fileName The file name query value, or null for none.
 * @returns A DELETE request.
 */
function del(fileName: string | null) {
  const query = fileName === null ? "" : `?fileName=${encodeURIComponent(fileName)}`;
  return new Request(`http://localhost/api/upload/csv/cleanup${query}`, { method: "DELETE" }) as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  root = mkdtempSync(path.join(tmpdir(), "pa-cleanup-"));
  temp = path.join(root, "temp");
  vi.spyOn(process, "cwd").mockReturnValue(root);
  mocks.currentUser.mockResolvedValue({ id: "a-1", role: "ADMIN" });
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

describe("DELETE /api/upload/csv/cleanup", () => {
  it("deletes one temp file", async () => {
    mkdirSync(temp);
    writeFileSync(path.join(temp, "1_upload.csv"), "x");
    const res = await DELETE(del("1_upload.csv"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, message: "File deleted successfully" });
    expect(existsSync(path.join(temp, "1_upload.csv"))).toBe(false);
  });

  it("answers 404 for a missing file", async () => {
    mkdirSync(temp);
    expect((await DELETE(del("2_gone.csv"))).status).toBe(404);
  });

  it("answers 400 without a file name", async () => {
    expect((await DELETE(del(null))).status).toBe(400);
  });

  it("lets SYSTEM delete", async () => {
    mocks.currentUser.mockResolvedValue({ id: "sys", role: "SYSTEM" });
    mkdirSync(temp);
    writeFileSync(path.join(temp, "3_a.csv"), "x");
    expect((await DELETE(del("3_a.csv"))).status).toBe(200);
  });

  it("answers 500 when the unlink fails", async () => {
    mkdirSync(path.join(temp, "4_dir.csv"), { recursive: true });
    expect((await DELETE(del("4_dir.csv"))).status).toBe(500);
  });

  it("answers 500 when the session lookup fails", async () => {
    mocks.currentUser.mockRejectedValue(new Error("down"));
    expect((await DELETE(del("1_upload.csv"))).status).toBe(500);
  });
});

describe("POST /api/upload/csv/cleanup", () => {
  it("answers 403 for a teacher and deletes nothing", async () => {
    mocks.currentUser.mockResolvedValue({ id: "t-1", role: "TEACHER" });
    mkdirSync(temp);
    const old = path.join(temp, `${Date.now() - 2 * DAY}_old.csv`);
    writeFileSync(old, "x");
    expect((await POST()).status).toBe(403);
    expect(existsSync(old)).toBe(true);
  });

  it("answers success when there is no temp folder", async () => {
    const res = await POST();
    expect(await res.json()).toEqual({ success: true, message: "No temp directory found" });
  });

  it("deletes only timestamped files older than one day", async () => {
    mkdirSync(temp);
    const now = Date.now();
    const old = `${now - 2 * DAY}_old.csv`;
    const fresh = `${now - 60_000}_fresh.csv`;
    writeFileSync(path.join(temp, old), "x");
    writeFileSync(path.join(temp, fresh), "x");
    writeFileSync(path.join(temp, "abc_named.csv"), "x");
    writeFileSync(path.join(temp, "plain.csv"), "x");
    const res = await POST();
    expect(await res.json()).toEqual({ success: true, message: "Cleaned up 1 old files" });
    expect(existsSync(path.join(temp, old))).toBe(false);
    expect(existsSync(path.join(temp, fresh))).toBe(true);
    expect(existsSync(path.join(temp, "abc_named.csv"))).toBe(true);
    expect(existsSync(path.join(temp, "plain.csv"))).toBe(true);
  });

  it("counts only the files it could delete", async () => {
    mkdirSync(temp);
    const stuck = `${Date.now() - 3 * DAY}_dir`;
    mkdirSync(path.join(temp, stuck));
    const res = await POST();
    expect(await res.json()).toEqual({ success: true, message: "Cleaned up 0 old files" });
  });

  it("answers 500 when the session lookup fails", async () => {
    mocks.currentUser.mockRejectedValue(new Error("down"));
    expect((await POST()).status).toBe(500);
  });
});
