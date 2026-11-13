// @vitest-environment node
/**
 * Red tests for the Drive query of the intake poll of the track
 * `accounting_drive_intake_20261109` (plan task 3.13, Review B r2 F309, PM
 * decision of 2026-11-13).
 *
 * The adapter `apps/accounting/app/lib/drive-document-source.ts` builds the
 * `q` value of `files.list` from the folder id. In the Drive query language a
 * quote inside a string is written `\'` and a backslash is written `\\`, so
 * the adapter must escape the backslash first and the quote second.
 *
 * Every row uses a fake Drive client that records the `q` value. The folder
 * ids are fakes; no real Drive id enters this file.
 */
import type { drive_v3 } from "googleapis";
import { describe, expect, it } from "vitest";

import { createDriveDocumentSource } from "../drive-document-source";

/**
 * Builds a fake Drive client that records every `q` value of `files.list`.
 * @returns The client and the recorded query values.
 */
function createRecordingDrive(): {
  readonly drive: drive_v3.Drive;
  readonly queries: string[];
} {
  const queries: string[] = [];
  const drive = {
    files: {
      list: async (params: { readonly q?: string }) => {
        queries.push(params.q ?? "");
        return { data: { files: [] } };
      },
    },
  } as unknown as drive_v3.Drive;
  return { drive, queries };
}

/**
 * Lists one fake folder and returns the first recorded query.
 * @param folderId Fake folder id to list.
 * @returns The `q` value the adapter sent.
 */
async function queryFor(folderId: string): Promise<string | undefined> {
  const { drive, queries } = createRecordingDrive();
  const source = await createDriveDocumentSource({ drive });
  await source.list({ folderId });
  return queries[0];
}

describe("the Drive query of the intake listing (Review B r2 F309)", () => {
  it("keeps a plain folder id unchanged in the query", async () => {
    expect(await queryFor("fake-plain-folder-id")).toBe(
      "'fake-plain-folder-id' in parents and trashed = false",
    );
  });

  it("escapes a quote in the folder id with a backslash", async () => {
    expect(await queryFor("abc'def")).toBe(
      "'abc\\'def' in parents and trashed = false",
    );
  });

  it("escapes a backslash in the folder id with a second backslash", async () => {
    expect(await queryFor("abc\\def")).toBe(
      "'abc\\\\def' in parents and trashed = false",
    );
  });

  it("escapes the backslash before the quote so no quote stays open", async () => {
    expect(await queryFor("a\\'b")).toBe(
      "'a\\\\\\'b' in parents and trashed = false",
    );
  });
});

/** Folder MIME type of the fake listing. */
const FOLDER_MIME = "application/vnd.google-apps.folder";

describe("the poll listing skips the year-file folders and the parent (Q29, task 10.12)", () => {
  it("lists the real-layout root and enters none of the five folders or the parent (poll_year_file_folder_queries=0)", async () => {
    const yearFolderIds = [
      "fake-yf-1",
      "fake-yf-2",
      "fake-yf-3",
      "fake-yf-4",
      "fake-yf-5",
      "fake-yf-parent",
    ];
    const queries: string[] = [];
    const drive = {
      files: {
        list: async (params: { readonly q?: string }) => {
          queries.push(params.q ?? "");
          if (!(params.q ?? "").startsWith("'fake-root' ")) {
            return { data: { files: [] } };
          }
          return {
            data: {
              files: [
                { id: "fake-yf-1", name: "fake-name-1", mimeType: FOLDER_MIME },
                { id: "fake-yf-parent", name: "fake-name-parent", mimeType: FOLDER_MIME },
                { id: "fake-customer", name: "fake-customer", mimeType: FOLDER_MIME },
                { id: "fake-2024", name: "2024", mimeType: FOLDER_MIME },
                { id: "fake-2025", name: "2025", mimeType: FOLDER_MIME },
                { id: "fake-root-file", name: "fake-root-file.pdf", mimeType: "application/pdf", size: "10" },
              ],
            },
          };
        },
      },
    } as unknown as drive_v3.Drive;
    const source = await createDriveDocumentSource({ drive });
    const listed = await source.list({ folderId: "fake-root" });
    const yearFolderQueries = queries.filter((query) =>
      yearFolderIds.some((id) => query.includes(`'${id}'`)),
    );
    console.log(`poll_year_file_folder_queries=${yearFolderQueries.length}`);
    expect(queries.length, "the poll lists the root at least once (A4)").toBeGreaterThanOrEqual(1);
    expect(
      yearFolderQueries,
      "poll_year_file_folder_queries=0: the poll never lists a year-file folder or the parent (Q29)",
    ).toEqual([]);
    expect(
      listed.map((file) => file.id),
      "the poll returns the root files only, with no folder",
    ).toEqual(["fake-root-file"]);
  });
});
