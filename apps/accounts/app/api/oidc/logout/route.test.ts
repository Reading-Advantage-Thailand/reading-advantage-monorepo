import { beforeEach, describe, expect, it, vi } from "vitest";

const { getIdentityComposition, localLogout } = vi.hoisted(() => ({
  getIdentityComposition: vi.fn(),
  localLogout: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { POST } from "./route";

const VALID_ACCESS_TOKEN = "abcdefghijklmnopqrstuvwxyABCDEF0123456789-_";

const invalidAuthorizationCases = [
  ["is missing", undefined],
  ["uses a different authorization scheme", `Basic ${VALID_ACCESS_TOKEN}`],
  ["uses a different scheme case", `bearer ${VALID_ACCESS_TOKEN}`],
  ["contains an empty bearer token", "Bearer "],
  [
    "contains whitespace inside the bearer token",
    `Bearer ${VALID_ACCESS_TOKEN.slice(0, 21)} ${VALID_ACCESS_TOKEN.slice(21)}`,
  ],
  [
    "contains a character outside base64url",
    `Bearer ${VALID_ACCESS_TOKEN.slice(0, -1)}!`,
  ],
  [
    "is one character shorter than the opaque token",
    `Bearer ${VALID_ACCESS_TOKEN.slice(0, -1)}`,
  ],
  [
    "is one character longer than the opaque token",
    `Bearer ${VALID_ACCESS_TOKEN}A`,
  ],
] as const;

describe("Accounts OIDC local logout route", () => {
  beforeEach(() => {
    getIdentityComposition.mockReset();
    localLogout.mockReset();
    getIdentityComposition.mockResolvedValue({ service: { localLogout } });
  });

  it.each(invalidAuthorizationCases)(
    "rejects a request whose authorization %s",
    async (_description, authorization) => {
      const response = await POST(
        new Request("https://accounts.example.test/api/oidc/logout", {
          method: "POST",
          headers: authorization === undefined ? undefined : { authorization },
        }),
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: "invalid_token",
      });
      expect(getIdentityComposition).not.toHaveBeenCalled();
      expect(localLogout).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    "revokes the exact opaque access token and returns revoked=%s",
    async (revoked) => {
      localLogout.mockResolvedValueOnce(revoked);

      const response = await POST(
        new Request("https://accounts.example.test/api/oidc/logout", {
          method: "POST",
          headers: { authorization: `Bearer ${VALID_ACCESS_TOKEN}` },
        }),
      );

      expect(localLogout).toHaveBeenCalledOnce();
      expect(localLogout).toHaveBeenCalledWith(VALID_ACCESS_TOKEN);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ revoked });
    },
  );
});
