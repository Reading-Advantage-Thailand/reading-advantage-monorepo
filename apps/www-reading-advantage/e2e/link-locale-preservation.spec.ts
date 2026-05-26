import { test, expect } from "@playwright/test";

const LOCALES = ["en", "th", "zh"] as const;

test.describe("Link locale preservation - rendered hrefs", () => {
  for (const locale of LOCALES) {
    test(`/${locale} homepage: every internal link has /${locale}/ prefix`, async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      const offendingLinks = await page.$$eval(
        "a",
        (anchors, l) =>
          anchors
            .map((a) => ({
              text: (a.textContent || "").trim().slice(0, 40),
              href: a.getAttribute("href") || "",
            }))
            .filter((info) => {
              const { href } = info;
              if (!href) return false;
              if (href.startsWith("http://") || href.startsWith("https://"))
                return false;
              if (href.startsWith("mailto:") || href.startsWith("tel:"))
                return false;
              if (href.startsWith("#")) return false;
              if (href === "/" || href === `/${l}`) return false;
              // Acceptable: already-prefixed with this locale
              if (href === `/${l}` || href.startsWith(`/${l}/`)) return false;
              return true;
            }),
        locale,
      );

      expect(
        offendingLinks,
        `Found ${offendingLinks.length} internal links on /${locale} whose href does NOT start with /${locale}/. Examples: ${JSON.stringify(offendingLinks.slice(0, 5))}`,
      ).toHaveLength(0);
    });

    test(`/${locale}/about: every internal link has /${locale}/ prefix`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/about`);

      const offendingLinks = await page.$$eval(
        "a",
        (anchors, l) =>
          anchors
            .map((a) => ({
              text: (a.textContent || "").trim().slice(0, 40),
              href: a.getAttribute("href") || "",
            }))
            .filter((info) => {
              const { href } = info;
              if (!href) return false;
              if (href.startsWith("http://") || href.startsWith("https://"))
                return false;
              if (href.startsWith("mailto:") || href.startsWith("tel:"))
                return false;
              if (href.startsWith("#")) return false;
              if (href === "/" || href === `/${l}`) return false;
              if (href === `/${l}` || href.startsWith(`/${l}/`)) return false;
              return true;
            }),
        locale,
      );

      expect(
        offendingLinks,
        `Found ${offendingLinks.length} internal links on /${locale}/about whose href does NOT start with /${locale}/. Examples: ${JSON.stringify(offendingLinks.slice(0, 5))}`,
      ).toHaveLength(0);
    });
  }
});
