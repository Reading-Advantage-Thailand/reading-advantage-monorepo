import { describe, expect, it } from "vitest";

import {
  createCompanyIdentityCookieConfig,
  createCompanyIdentitySecurityConfig,
  createCompanyIdentityServiceAuthConfig,
} from "../environment.js";

const COOKIE_ENV = {
  NODE_ENV: "production",
  COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
  COMPANY_AUTH_COOKIE_NAME: "__Host-ra_company_sso",
  COMPANY_AUTH_COOKIE_SECURE: "true",
  COMPANY_AUTH_COOKIE_SAME_SITE: "lax",
  COMPANY_AUTH_COOKIE_PATH: "/",
};

const SERVICE_ENV = {
  NODE_ENV: "production",
  COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
  COMPANY_AUTH_OIDC_CLIENT_ID: "marketing-server",
  COMPANY_AUTH_OIDC_CLIENT_SECRET: "confidential-client-secret-value-32",
  COMPANY_AUTH_OIDC_REDIRECT_URI: "https://marketing.example.com/auth/company/callback",
  COMPANY_AUTH_EXPECTED_AUDIENCE: "marketing",
};

describe("issuer URL rules", () => {
  it.each([
    ["not a URL", "accounts", "Issuer must be an absolute URL."],
    ["surrounding whitespace", " https://accounts.example.com", "must not contain surrounding whitespace"],
    ["credentials", "https://u:p@accounts.example.com", "must not contain credentials"],
    ["a query", "https://accounts.example.com?x=1", "must not contain a query"],
    ["a fragment", "https://accounts.example.com#x", "must not contain a fragment"],
    ["a trailing slash", "https://accounts.example.com/", "must not contain a trailing slash"],
    ["HTTP in production", "http://127.0.0.1:3000", "Issuer must use HTTPS"],
  ])("rejects an issuer with %s", (_label, issuer, message) => {
    expect(() =>
      createCompanyIdentityCookieConfig({ ...COOKIE_ENV, COMPANY_AUTH_ISSUER_URL: issuer }),
    ).toThrow(message);
  });

  it("names the field but not the value in the error", () => {
    let message = "";
    try {
      createCompanyIdentityCookieConfig({
        ...COOKIE_ENV,
        COMPANY_AUTH_ISSUER_URL: "https://secret-user:secret-pass@accounts.example.com",
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("Invalid company identity cookie environment");
    expect(message).toContain("COMPANY_AUTH_ISSUER_URL");
    expect(message).not.toContain("secret-pass");
  });

  it.each([
    ["localhost", "http://localhost:3000"],
    ["an IPv6 loopback", "http://[::1]:3000"],
  ])("allows a ported HTTP %s issuer in development", (_label, issuer) => {
    const env = {
      ...COOKIE_ENV,
      NODE_ENV: "development",
      COMPANY_AUTH_ISSUER_URL: issuer,
      COMPANY_AUTH_COOKIE_SECURE: "false",
      COMPANY_AUTH_COOKIE_NAME: "ra_company_sso",
    };
    expect(createCompanyIdentityCookieConfig(env)).toMatchObject({ secure: false });
  });

  it("rejects an unported HTTP loopback issuer in development", () => {
    expect(() =>
      createCompanyIdentityCookieConfig({
        ...COOKIE_ENV,
        NODE_ENV: "development",
        COMPANY_AUTH_ISSUER_URL: "http://localhost",
      }),
    ).toThrow("Issuer must use HTTPS");
  });

  it("rejects a non-loopback HTTP issuer in test", () => {
    expect(() =>
      createCompanyIdentityCookieConfig({
        ...COOKIE_ENV,
        NODE_ENV: "test",
        COMPANY_AUTH_ISSUER_URL: "http://accounts.example.com:8080",
      }),
    ).toThrow("Issuer must use HTTPS");
  });
});

describe("development cookie rules", () => {
  const devEnv = {
    ...COOKIE_ENV,
    NODE_ENV: "development",
    COMPANY_AUTH_ISSUER_URL: "http://localhost:3000",
    COMPANY_AUTH_COOKIE_SECURE: "false",
    COMPANY_AUTH_COOKIE_NAME: "ra_company_sso",
  };

  it("rejects an insecure development cookie with another name", () => {
    expect(() =>
      createCompanyIdentityCookieConfig({ ...devEnv, COMPANY_AUTH_COOKIE_NAME: "other" }),
    ).toThrow("Insecure development cookie name must be ra_company_sso.");
  });

  it("rejects an insecure development cookie with an HTTPS issuer", () => {
    expect(() =>
      createCompanyIdentityCookieConfig({
        ...devEnv,
        COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
      }),
    ).toThrow("Insecure development cookies require a loopback HTTP issuer");
  });

  it("rejects an insecure development cookie when the issuer is not a URL", () => {
    expect(() =>
      createCompanyIdentityCookieConfig({ ...devEnv, COMPANY_AUTH_ISSUER_URL: "nope" }),
    ).toThrow("Insecure development cookies require a loopback HTTP issuer");
  });

  it("rejects a cookie Domain", () => {
    expect(() =>
      createCompanyIdentityCookieConfig({ ...COOKIE_ENV, COMPANY_AUTH_COOKIE_DOMAIN: "example.com" }),
    ).toThrow("must not set Domain");
  });

  it("defaults the cookie name to the __Host- form", () => {
    const { COMPANY_AUTH_COOKIE_NAME: _omit, ...rest } = COOKIE_ENV;
    expect(createCompanyIdentityCookieConfig(rest)).toMatchObject({
      name: "__Host-ra_company_sso",
      httpOnly: true,
    });
  });
});

describe("redirect URI rules", () => {
  it.each([
    ["not a URL", "callback", "Redirect URI must be an exact absolute URL."],
    ["surrounding whitespace", "https://m.example.com/cb ", "must not contain surrounding whitespace"],
    ["a wildcard", "https://*.example.com/cb", "must not contain a wildcard"],
    ["credentials", "https://u:p@m.example.com/cb", "Redirect URI must not contain credentials"],
    ["a fragment", "https://m.example.com/cb#x", "Redirect URI must not contain a fragment"],
    ["HTTP in production", "http://localhost:3000/cb", "Redirect URI must use HTTPS"],
  ])("rejects a redirect with %s", (_label, uri, message) => {
    expect(() =>
      createCompanyIdentityServiceAuthConfig({ ...SERVICE_ENV, COMPANY_AUTH_OIDC_REDIRECT_URI: uri }),
    ).toThrow(message);
  });

  it("allows a ported HTTP loopback redirect in development", () => {
    const env = {
      ...SERVICE_ENV,
      NODE_ENV: "development",
      COMPANY_AUTH_OIDC_REDIRECT_URI: "http://127.0.0.1:4000/cb",
    };
    expect(createCompanyIdentityServiceAuthConfig(env)).toMatchObject({
      redirectUri: "http://127.0.0.1:4000/cb",
    });
  });

  it("rejects an unported HTTP loopback redirect in development", () => {
    expect(() =>
      createCompanyIdentityServiceAuthConfig({
        ...SERVICE_ENV,
        NODE_ENV: "development",
        COMPANY_AUTH_OIDC_REDIRECT_URI: "http://localhost/cb",
      }),
    ).toThrow("Redirect URI must use HTTPS");
  });
});

describe("identifier hash key rules", () => {
  it.each([
    ["a non-canonical base64url tail", `${Buffer.alloc(32, 7).toString("base64url").slice(0, -1)}9`],
    ["a padded value", `${Buffer.alloc(32, 7).toString("base64")}`],
    ["a short key", Buffer.alloc(31, 7).toString("base64url")],
  ])("rejects %s", (_label, key) => {
    expect(() =>
      createCompanyIdentitySecurityConfig({ COMPANY_AUTH_IDENTIFIER_HASH_KEY: key }),
    ).toThrow("COMPANY_AUTH_IDENTIFIER_HASH_KEY");
  });

  it("reports unknown keys by name", () => {
    expect(() =>
      createCompanyIdentitySecurityConfig({
        COMPANY_AUTH_IDENTIFIER_HASH_KEY: Buffer.alloc(32, 7).toString("base64url"),
        EXTRA: "x",
      }),
    ).toThrow("unrecognized keys: EXTRA");
  });
});
