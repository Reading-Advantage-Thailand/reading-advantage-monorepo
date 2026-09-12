import { getStorageClient } from "@reading-advantage/storage";

import {
  WIZARD_SPEECH_MANIFEST_ENV,
  getWizardSpeechLookup,
} from "./content-dependencies";

jest.mock("@reading-advantage/auth", () => ({
  ROLES: {
    STUDENT: "STUDENT", TEACHER: "TEACHER", ADMIN: "ADMIN", SYSTEM: "SYSTEM",
  },
  SESSION_COOKIE_NAME: "session_token",
  assertCan: jest.fn(),
  registerDomainModulePermissions: jest.fn(),
  validateSession: jest.fn(),
}));
jest.mock("@reading-advantage/db", () => ({ db: {} }));
jest.mock("@reading-advantage/domain/db-contract", () => ({ createTenantDB: jest.fn() }));
jest.mock(
  "@reading-advantage/storage",
  () => ({ getStorageClient: jest.fn() }),
  { virtual: true },
);

const storage = {
  exists: jest.fn(),
  getSignedUrl: jest.fn(),
};

describe("getWizardSpeechLookup", () => {
  const originalManifest = process.env[WIZARD_SPEECH_MANIFEST_ENV];

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env[WIZARD_SPEECH_MANIFEST_ENV];
    jest.mocked(getStorageClient).mockReturnValue(storage as never);
  });

  afterAll(() => {
    if (originalManifest === undefined) delete process.env[WIZARD_SPEECH_MANIFEST_ENV];
    else process.env[WIZARD_SPEECH_MANIFEST_ENV] = originalManifest;
  });

  it("keeps listening disabled when no reviewed manifest is configured", () => {
    expect(getWizardSpeechLookup()).toBeUndefined();
    expect(getStorageClient).not.toHaveBeenCalled();
  });

  it("resolves exact configured clips through internal storage", async () => {
    process.env[WIZARD_SPEECH_MANIFEST_ENV] = JSON.stringify({
      schemaVersion: 1,
      clips: [{
        text: "river",
        sourceLocale: "en-US",
        key: "apk/speech/en-US/river.mp3",
        mediaType: "audio/mpeg",
      }],
    });
    storage.exists.mockResolvedValue(true);
    storage.getSignedUrl.mockResolvedValue("https://cdn.example/river.mp3");

    const lookup = getWizardSpeechLookup();
    await expect(lookup?.find({
      itemPosition: 0,
      text: "river",
      sourceLocale: "en-US",
      userId: "student-1",
      schoolId: "school-1",
      signal: new AbortController().signal,
    })).resolves.toEqual({
      url: "https://cdn.example/river.mp3",
      mediaType: "audio/mpeg",
      sourceLocale: "en-US",
    });
    expect(storage.exists).toHaveBeenCalledWith("apk/speech/en-US/river.mp3");
    expect(storage.getSignedUrl).toHaveBeenCalledWith(
      "apk/speech/en-US/river.mp3",
      900,
    );
  });
});
