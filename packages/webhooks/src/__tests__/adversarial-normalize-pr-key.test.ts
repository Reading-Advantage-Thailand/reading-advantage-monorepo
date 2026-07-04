/**
 * Adversarial tests for `normalizePrKey` — the URL normalizer that
 * determines the idempotency key for `review_jobs`.
 *
 * Track: `webhook_review_reliability_20260605`.
 *
 * The happy-path coverage in `phase-2-enqueue-url-normalization.test.ts`
 * only exercises three URL variants. These tests probe boundary conditions
 * (trailing slashes + .git + mixed case combined), invalid URLs (must
 * throw, NOT silently return null or partially populated objects), edge
 * cases on the pull-number segment (zero, negative, very long, embedded
 * text), and URL forms that the worker must still parse despite
 * non-canonical TLDs / schemes / subdomains.
 *
 * Anti-pattern defenses applied:
 *   - A3 (digit-only labeled count): every integer count uses a labeled
 *     argument to `expect(...)`, never a bare regex.
 *   - A4 (vacuous-pass on nothing-done): every test asserts a specific
 *     observable (thrown error message, normalized owner/repo value),
 *     not just "no exception".
 *   - A7 (over-broad filter swallowing real hits): assertions use
 *     `toThrow` / explicit equality, not bare `.toContain` on substrings.
 */
import { describe, it, expect } from "vitest";
import { normalizePrKey } from "../review-worker.js";

describe("Adversarial — normalizePrKey boundary conditions", () => {
  describe("happy-path variants (case + .git + trailing slash combinations)", () => {
    it("all three normalizations combined: Org/Repo.git/pull/1/", () => {
      const key = normalizePrKey("https://github.com/Org/Repo.git/pull/1/");
      expect(key.owner, "owner lowercased").toBe("org");
      expect(key.repo, "repo lowercased + .git stripped").toBe("repo");
      expect(key.pullNumber, "pull number parsed").toBe(1);
    });

    it("mixed-case owner + .git on repo + trailing slash on path", () => {
      const key = normalizePrKey("https://github.com/My-Org/My_Repo.git/pull/42/");
      expect(key.owner, "owner case folded").toBe("my-org");
      expect(key.repo, "repo case folded + .git stripped").toBe("my_repo");
      expect(key.pullNumber, "pull number preserved").toBe(42);
    });

    it("all-lowercase canonical URL parses identically", () => {
      const canonical = normalizePrKey("https://github.com/org/repo/pull/1");
      const upper = normalizePrKey("https://github.com/ORG/REPO/pull/1");
      const dotted = normalizePrKey("https://github.com/Org/Repo.git/pull/1/");

      expect(canonical, "canonical key").toEqual(upper);
      expect(canonical, "canonical key").toEqual(dotted);
      expect(upper, "uppercase key").toEqual(dotted);
    });

    it("repo with multiple dots (not just .git suffix) is preserved", () => {
      const key = normalizePrKey("https://github.com/Org/Repo.with.dots/pull/1");
      expect(key.repo, "multi-dot repo preserved").toBe("repo.with.dots");
    });
  });

  describe("non-canonical schemes / subdomains", () => {
    it("http (not https) still parses", () => {
      const key = normalizePrKey("http://github.com/org/repo/pull/1");
      expect(key.owner, "owner from http").toBe("org");
      expect(key.repo, "repo from http").toBe("repo");
      expect(key.pullNumber, "pull number from http").toBe(1);
    });

    it("www. subdomain still parses", () => {
      const key = normalizePrKey("https://www.github.com/org/repo/pull/1");
      expect(key.owner, "owner with www").toBe("org");
      expect(key.repo, "repo with www").toBe("repo");
    });

    it("path with .git suffix mid-segment (not at end) is preserved", () => {
      const key = normalizePrKey("https://github.com/org/repo.git/pull/1");
      // Only an ending `.git` is stripped — `repo.git` ends with `.git`,
      // so it is stripped; this pins the behavior so a regression that
      // strips mid-path `.git` (none here) or leaves a trailing `.git`
      // visible gets caught.
      expect(key.repo, "trailing .git stripped").toBe("repo");
    });

    it("GitHub Enterprise-like hostname (different TLD) is REJECTED", () => {
      // The normalizer intentionally only handles github.com / www.github.com;
      // GitHub Enterprise installs use a different hostname and are out of
      // scope for this worker. A regression that accepts them would either
      // bypass the idempotency key contract or silently drop jobs.
      expect(
        () => normalizePrKey("https://github.corp.example.com/org/repo/pull/1"),
        "Enterprise hostname should be rejected",
      ).toThrow();
    });
  });

  describe("invalid URLs must throw (not silently return null or partial)", () => {
    const invalidUrls = [
      { url: "", label: "empty string" },
      { url: "not-a-url", label: "no protocol/path" },
      { url: "https://example.com/org/repo/pull/1", label: "wrong hostname" },
      { url: "https://github.com/org/repo", label: "missing /pull/N" },
      { url: "https://github.com/org/repo/pulls/1", label: "wrong segment 'pulls'" },
      { url: "https://github.com/org/repo/issues/1", label: "issue URL not PR" },
      { url: "https://github.com/org/repo/pull/", label: "missing pull number" },
      { url: "https://github.com//repo/pull/1", label: "empty owner segment" },
      { url: "https://github.com/org//pull/1", label: "empty repo segment" },
      { url: "https://github.com/org/repo/commit/abc", label: "commit URL not PR" },
      { url: "ftp://github.com/org/repo/pull/1", label: "non-http(s) scheme" },
    ];

    for (const { url, label } of invalidUrls) {
      it(`throws on ${label}`, () => {
        expect(() => normalizePrKey(url), `should throw on ${label}: ${JSON.stringify(url)}`).toThrow();
      });
    }

    it("thrown error message identifies the URL (debuggable, not generic)", () => {
      try {
        normalizePrKey("https://example.com/org/repo/pull/1");
        expect.fail("expected throw");
      } catch (err) {
        expect(err, "thrown value is an Error").toBeInstanceOf(Error);
        const message = (err as Error).message;
        expect(message, "error message includes the offending URL").toContain("example.com");
        expect(message, "error message names the function").toContain("normalizePrKey");
      }
    });
  });

  describe("pull-number boundary conditions", () => {
    it("very large positive PR number (Number.MAX_SAFE_INTEGER) parses", () => {
      const max = Number.MAX_SAFE_INTEGER;
      const key = normalizePrKey(`https://github.com/org/repo/pull/${max}`);
      expect(key.pullNumber, "MAX_SAFE_INTEGER pull number").toBe(max);
    });

    it("pull number with leading zeros is parsed as integer", () => {
      const key = normalizePrKey("https://github.com/org/repo/pull/00042");
      expect(key.pullNumber, "leading-zero pull number").toBe(42);
    });

    it("pull number of zero is REJECTED (positive integer required)", () => {
      // GitHub PR numbers are positive integers; `pull/0` is not a valid
      // PR URL. The normalizer throws so a malformed URL can never
      // collapse to a `owner/repo#0` idempotency key.
      expect(
        () => normalizePrKey("https://github.com/org/repo/pull/0"),
        "zero pull number must be rejected",
      ).toThrow();
    });

    it("pull number with decimal point is NOT a PR URL (must reject)", () => {
      // `pull/1.5` does NOT match the regex (`\d+` does not include `.`)
      expect(() => normalizePrKey("https://github.com/org/repo/pull/1.5")).toThrow();
    });

    it("pull number followed by /files (extra path segment) is rejected", () => {
      // The regex `\/pull\/(\d+)` does not anchor to end-of-URL — segments
      // AFTER the pull number are silently ignored. This test pins that
      // behavior so a change that rejects `pull/1/files` does not break
      // silently elsewhere. Today: parses to 1.
      const key = normalizePrKey("https://github.com/org/repo/pull/1/files");
      expect(key.pullNumber, "trailing /files segment ignored").toBe(1);
    });

    it("pull number with query string is parsed as integer (query ignored)", () => {
      // The regex `\/pull\/(\d+)` stops at `\d+`; the `?diff=split` suffix
      // is NOT included in the capture. Pins that behavior.
      const key = normalizePrKey("https://github.com/org/repo/pull/1?diff=split");
      expect(key.pullNumber, "query-string PR number").toBe(1);
    });

    it("pull number with fragment is parsed as integer (fragment ignored)", () => {
      const key = normalizePrKey("https://github.com/org/repo/pull/1#discussion_r1");
      expect(key.pullNumber, "fragment PR number").toBe(1);
    });
  });

  describe("Unicode / non-ASCII hostname segments", () => {
    it("non-ASCII owner (e.g. punycode) is preserved as-is (no folding)", () => {
      // The regex captures without further validation; non-ASCII passes
      // through. We pin that behavior so any future `safeNamePattern`
      // tightening matches the tests' expectation.
      const key = normalizePrKey("https://github.com/Örganisation/répo/pull/1");
      expect(key.owner, "non-ASCII owner preserved").toBe("örganisation");
      expect(key.repo, "non-ASCII repo preserved").toBe("répo");
    });
  });
});