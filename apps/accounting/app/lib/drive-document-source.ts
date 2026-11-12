/**
 * Google Drive adapter of the intake poll (FR-11, spec section 5).
 *
 * The adapter is read-only: it lists the intake folder, downloads the bytes of
 * a binary file, and exports a native Google Sheet as an `.xlsx` workbook. It
 * holds no create, update, delete, or copy call. It authenticates with
 * Application Default Credentials on the Cloud Run runtime service account and
 * holds no key file.
 */
import { google, type drive_v3 } from "googleapis";

import type {
  AccountingDocumentSourcePort,
  AccountingDriveFile,
} from "@reading-advantage/backend/accounting";

/** MIME type of a native Google Sheet. */
const GOOGLE_SHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

/** MIME type of an `.xlsx` workbook. */
const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** MIME type of a Drive folder. */
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

/** First year whose subfolder the poll reads (spec section 5). */
const FIRST_YEAR_FOLDER = 2027;

/** One Drive listing entry, with the folder marker kept for the year rule. */
interface DriveListingEntry extends AccountingDriveFile {
  /** True when the entry is a folder, not a file. */
  readonly isFolder: boolean;
}

/**
 * Reads the intake folder id from the environment. No folder id enters git,
 * a test, a log line, or a fixture (criterion 28).
 * @returns The configured Drive folder id.
 * @throws When the environment variable is absent or blank.
 */
export function readIntakeFolderId(): string {
  const folderId = process.env.ACCOUNTING_DRIVE_FOLDER_ID;
  if (folderId === undefined || folderId.trim() === "") {
    throw new Error("The intake folder id is not configured");
  }
  return folderId;
}

/**
 * Converts one Drive response body into file bytes.
 * @param data Array buffer or byte view returned by the Drive client.
 * @returns The bytes of the file.
 */
function toBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (data instanceof Uint8Array) return data;
  return new Uint8Array(data);
}

/**
 * Lists one Drive folder, following the page token to the end.
 * @param drive Authenticated Drive client.
 * @param folderId Folder id to list.
 * @returns The files and folders directly inside the folder.
 */
async function listFolderEntries(
  drive: drive_v3.Drive,
  folderId: string,
): Promise<DriveListingEntry[]> {
  const entries: DriveListingEntry[] = [];
  let pageToken: string | undefined;
  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(pageToken === undefined ? {} : { pageToken }),
    });
    const files = response.data.files ?? [];
    for (const file of files) {
      if (file.id === undefined || file.id === null) continue;
      const mimeType = file.mimeType ?? "";
      const size =
        file.size === undefined || file.size === null
          ? undefined
          : Number(file.size);
      entries.push({
        id: file.id,
        name: file.name ?? "",
        mimeType,
        ...(size === undefined || Number.isNaN(size) ? {} : { byteSize: size }),
        ...(file.modifiedTime === undefined || file.modifiedTime === null
          ? {}
          : { modifiedTime: file.modifiedTime }),
        isFolder: mimeType === DRIVE_FOLDER_MIME_TYPE,
      });
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken !== undefined);
  return entries;
}

/**
 * Builds the read-only Drive port of the intake poll.
 * @param input Optional injected Drive client and clock year; tests and the
 *   runner leave them absent.
 * @returns The Drive port.
 */
export function createDriveDocumentSource(input?: {
  readonly drive?: drive_v3.Drive;
}): AccountingDocumentSourcePort {
  const drive =
    input?.drive ??
    google.drive({
      version: "v3",
      auth: new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      }),
    });

  return {
    /**
     * Lists the top level of the intake folder and, from 2027, the subfolder
     * of the current year. It never lists the `2024` and `2025` folders
     * (PM-6).
     * @param request Trusted folder id of the intake folder.
     * @returns The files of the listing.
     */
    async list(request: {
      readonly folderId: string;
    }): Promise<readonly AccountingDriveFile[]> {
      const topLevel = await listFolderEntries(drive, request.folderId);
      const entries = [...topLevel];
      const year = new Date().getFullYear();
      if (year >= FIRST_YEAR_FOLDER) {
        const yearFolder = topLevel.find(
          (entry) => entry.isFolder && entry.name === String(year),
        );
        if (yearFolder !== undefined) {
          const nested = await listFolderEntries(drive, yearFolder.id);
          entries.push(...nested);
        }
      }
      return entries
        .filter((entry) => !entry.isFolder)
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          mimeType: entry.mimeType,
          ...(entry.byteSize === undefined
            ? {}
            : { byteSize: entry.byteSize }),
          ...(entry.modifiedTime === undefined
            ? {}
            : { modifiedTime: entry.modifiedTime }),
        }));
    },

    /**
     * Downloads the bytes of one binary Drive file with `alt=media`.
     * @param request Drive file id of the file.
     * @returns The file bytes.
     */
    async download(request: { readonly fileId: string }): Promise<Uint8Array> {
      const response = await drive.files.get(
        {
          fileId: request.fileId,
          alt: "media",
          supportsAllDrives: true,
        },
        { responseType: "arraybuffer" },
      );
      return toBytes(response.data as ArrayBuffer | Uint8Array);
    },

    /**
     * Exports one native Google Sheet as an `.xlsx` workbook. The workbook
     * reader then reads every tab on this machine (spec section 6).
     * @param request Drive file id of the sheet.
     * @returns The exported workbook bytes.
     */
    async export(request: { readonly fileId: string }): Promise<Uint8Array> {
      const response = await drive.files.export(
        {
          fileId: request.fileId,
          mimeType: XLSX_MIME_TYPE,
        },
        { responseType: "arraybuffer" },
      );
      return toBytes(response.data as ArrayBuffer | Uint8Array);
    },
  };
}

/**
 * Returns the MIME type of a native Google Sheet, for a caller that decides
 * between `download` and `export`.
 * @returns The native Google Sheet MIME type.
 */
export function googleSheetMimeType(): string {
  return GOOGLE_SHEET_MIME_TYPE;
}
