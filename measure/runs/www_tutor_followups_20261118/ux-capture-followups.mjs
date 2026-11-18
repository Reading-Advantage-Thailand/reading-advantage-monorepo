// Capture client for www_tutor_followups_20261118 plan task 1.7.
// Runs inside ONE heavy-run job after `next start -p 3107`.
// Writes 12 section crops + 3 full-page en crops + checks.json.
// Exits non-zero when an automated check fails.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/daniebo/Desktop/rama-worktrees/www-tutor-followups/measure/runs/www_tutor_followups_20261118/p1-captures";
const BASE = "http://127.0.0.1:3107";
const WIDTHS = [390, 980, 1280];
const HEIGHTS = { 390: 844, 980: 900, 1280: 900 };
const LOCALES = ["en", "th"];
const BLOCKS = ["hero", "become-a-tutor"];
const SELECTOR = { hero: "section:has(h1)", "become-a-tutor": "#become-a-tutor" };
const EXPECT_SRC = {
  hero: "tutor-advantage-hero-2026-11-06.webp",
  "become-a-tutor": "tutor-advantage-teach-class.webp",
};
const LOCALE_FILE =
  "/home/daniebo/Desktop/rama-worktrees/www-tutor-followups/apps/www-reading-advantage/src/locales/pages/products/tutor-advantage.ts";
const RATIO_16_9 = 16 / 9;
const RATIO_TOLERANCE = 0.02; // 2 percent

fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const captures = [];
const fullpage = [];
const ariaSnapshots = {};
const interactions = [];
const pageErrors = [];
const consoleErrors = [];

/** Reads the delivered alt strings from the locale file (no hand transcription). */
function expectedAlts() {
  const src = fs.readFileSync(LOCALE_FILE, "utf8");
  const grab = (re) => {
    const m = src.match(re);
    return m ? m[1] : null;
  };
  return {
    en: {
      hero: grab(/"imageAlt":\s*"(A tutor smiles[^"]*)"/),
      "become-a-tutor": grab(/"alt":\s*"(A tutor with three schoolchildren[^"]*)"/),
    },
    th: {
      hero: grab(/"imageAlt":\s*"(ติวเตอร์ยิ้ม[^"]*)"/),
      "become-a-tutor": grab(/"alt":\s*"(ติวเตอร์กับ[^"]*)"/),
    },
  };
}

// Inlined into page.evaluate below: collects one section's picture facts and any
// text box that touches the picture box. page.evaluate serializes only its callback,
// so this helper must be part of the callback, not referenced from Node side.

function recordFailure(msg) {
  failures.push(msg);
  console.log("FAIL " + msg);
}

const alts = expectedAlts();
for (const locale of LOCALES) {
  for (const block of BLOCKS) {
    if (!alts[locale] || !alts[locale][block]) {
      recordFailure(`alt extraction from locale file failed: ${locale} ${block}`);
    }
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.on("pageerror", (e) => pageErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

try {
  for (const locale of LOCALES) {
    const url = `${BASE}/${locale}/products/tutor-advantage`;
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: HEIGHTS[width] });
      try {
        await page.goto(url, { waitUntil: "load", timeout: 30000 });
      } catch (e) {
        recordFailure(`${locale}-${width}: goto failed: ${e.message}`);
        continue;
      }

      // Scroll pass so lazy images load.
      await page.evaluate(async () => {
        const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
        const limit = () =>
          Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        for (let y = 0; y < limit(); y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 50));
        }
        window.scrollTo(0, 0);
      });

      try {
        await page.waitForFunction(
          () => {
            const imgs = Array.from(
              document.querySelectorAll("section:has(h1) img, #become-a-tutor img")
            );
            return imgs.length >= 2 && imgs.every((i) => i.complete && i.naturalWidth > 0);
          },
          null,
          { timeout: 15000 }
        );
      } catch (e) {
        recordFailure(`${locale}-${width}: section images did not reach complete with naturalWidth > 0`);
      }

      const scroll = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        ok: document.documentElement.scrollWidth <= window.innerWidth,
      }));

      for (const block of BLOCKS) {
        const sel = SELECTOR[block];
        const expectSrc = EXPECT_SRC[block];
        const expectAlt = (alts[locale][block] || "").trim();
        const loc = page.locator(sel).first();
        try {
          await loc.scrollIntoViewIfNeeded();
        } catch (e) {
          recordFailure(`${locale}-${width} ${block}: section not found for scroll: ${e.message}`);
          continue;
        }
        await page.waitForTimeout(150);

        const data = await page.evaluate((s) => {
          const section = document.querySelector(s);
          if (!section) return { error: "section not found: " + s };
          const imgs = Array.from(section.querySelectorAll("img"));
          if (!imgs.length) return { error: "no img in section: " + s };
          let img = imgs[0];
          let best = -1;
          for (const i of imgs) {
            const area = i.clientWidth * i.clientHeight;
            if (area > best) {
              best = area;
              img = i;
            }
          }
          const r = img.getBoundingClientRect();
          const overlaps = [];
          for (const el of section.querySelectorAll("*")) {
            if (el === img || el.contains(img)) continue;
            let hasText = false;
            for (const n of el.childNodes) {
              if (n.nodeType === 3 && n.textContent.trim().length > 0) {
                hasText = true;
                break;
              }
            }
            if (!hasText) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0)
              continue;
            const er = el.getBoundingClientRect();
            if (er.width <= 0 || er.height <= 0) continue;
            const ix = Math.min(er.right, r.right) - Math.max(er.left, r.left);
            const iy = Math.min(er.bottom, r.bottom) - Math.max(er.top, r.top);
            if (ix > 2 && iy > 2) {
              overlaps.push({
                tag: el.tagName,
                text: (el.textContent || "").trim().slice(0, 80),
                intersectWidth: Math.round(ix),
                intersectHeight: Math.round(iy),
              });
            }
          }
          const heading = section.querySelector("h1, h2");
          return {
            currentSrc: img.currentSrc || img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            clientWidth: img.clientWidth,
            clientHeight: img.clientHeight,
            alt: img.getAttribute("alt"),
            loading: img.getAttribute("loading"),
            complete: img.complete,
            imgCount: imgs.length,
            allImgSrcs: imgs.map((i) => i.currentSrc || i.src),
            overlaps,
            heading: heading ? heading.textContent.trim() : "",
          };
        }, sel);
        if (data.error) {
          recordFailure(`${locale}-${width} ${block}: ${data.error}`);
          continue;
        }

        const file = `${locale}-${block}-${width}.png`;
        try {
          await loc.screenshot({ path: path.join(OUT, file) });
        } catch (e) {
          recordFailure(`${locale}-${width} ${block}: screenshot failed: ${e.message}`);
          continue;
        }

        const srcOk = String(data.currentSrc).includes(expectSrc);
        const naturalOk = data.naturalWidth === 1920 && data.naturalHeight === 1080;
        const ratio = data.clientHeight > 0 ? Number((data.clientWidth / data.clientHeight).toFixed(4)) : 0;
        const ratioOk =
          data.clientHeight > 0 && Math.abs(ratio - RATIO_16_9) / RATIO_16_9 <= RATIO_TOLERANCE;
        const altOk = String(data.alt || "").trim() === expectAlt;
        const overlap = data.overlaps.length > 0;
        const scrollOk = scroll.ok;

        const entry = {
          url,
          width,
          block,
          file,
          currentSrc: data.currentSrc,
          expectedSrcContains: expectSrc,
          src_ok: srcOk,
          naturalWidth: data.naturalWidth,
          naturalHeight: data.naturalHeight,
          natural_ok: naturalOk,
          renderedWidth: data.clientWidth,
          renderedHeight: data.clientHeight,
          ratio,
          ratio_ok: ratioOk,
          alt: data.alt,
          alt_ok: altOk,
          expectedAlt: expectAlt,
          loading: data.loading,
          faces_and_book_visible: null,
          overlap,
          overlap_elements: data.overlaps,
          scroll_ok: scrollOk,
          scrollWidth: scroll.scrollWidth,
          innerWidth: scroll.innerWidth,
          heading: data.heading,
          imgCount: data.imgCount,
          allImgSrcs: data.allImgSrcs,
        };
        captures.push(entry);

        if (!srcOk) {
          recordFailure(
            `${locale}-${width} ${block}: currentSrc missing ${expectSrc} (got ${data.currentSrc})`
          );
        }
        if (!naturalOk) {
          recordFailure(
            `${locale}-${width} ${block}: natural size ${data.naturalWidth}x${data.naturalHeight}, expected 1920x1080`
          );
        }
        if (!ratioOk) {
          recordFailure(
            `${locale}-${width} ${block}: rendered ratio ${ratio} outside 2 percent of 16:9`
          );
        }
        if (!altOk) {
          recordFailure(`${locale}-${width} ${block}: alt mismatch (got "${data.alt}")`);
        }
        if (overlap) {
          recordFailure(
            `${locale}-${width} ${block}: text overlaps picture: ${JSON.stringify(data.overlaps)}`
          );
        }
        if (!scrollOk) {
          recordFailure(
            `${locale}-${width}: horizontal scroll, scrollWidth ${scroll.scrollWidth} > innerWidth ${scroll.innerWidth}`
          );
        }
        console.log(
          `OK ${locale}-${width} ${block}: src=${srcOk} nat=${naturalOk} ratio=${ratio} ratioOk=${ratioOk} altOk=${altOk} overlap=${overlap} scrollOk=${scrollOk} file=${file}`
        );
      }

      if (locale === "en") {
        await page.evaluate(() => window.scrollTo(0, 0));
        const fp = `en-full-${width}.png`;
        try {
          await page.screenshot({ path: path.join(OUT, fp), fullPage: true });
          fullpage.push({
            url,
            width,
            block: "full",
            file: fp,
            scroll_ok: scroll.ok,
            scrollWidth: scroll.scrollWidth,
            innerWidth: scroll.innerWidth,
          });
          console.log(`OK fullpage en-${width}: ${fp}`);
        } catch (e) {
          recordFailure(`en-${width}: full-page screenshot failed: ${e.message}`);
        }
      }

      if (width === 1280) {
        try {
          ariaSnapshots[`${locale}-1280-hero`] = await page
            .locator("section:has(h1)")
            .first()
            .ariaSnapshot();
          ariaSnapshots[`${locale}-1280-become-a-tutor`] = await page
            .locator("#become-a-tutor")
            .ariaSnapshot();
        } catch (e) {
          ariaSnapshots[`${locale}-1280-error`] = String(e);
        }
      }

      if (locale === "en" && width === 1280) {
        await page.evaluate(() => window.scrollTo(0, 0));
        try {
          await page.locator('section:has(h1) a[href="#become-a-tutor"]').first().click();
          await page.waitForTimeout(1000);
          const anchor = await page.evaluate(() => {
            const el = document.getElementById("become-a-tutor");
            const r = el ? el.getBoundingClientRect() : null;
            return {
              hash: location.hash,
              sectionTop: r ? Math.round(r.top) : null,
              inView: r ? r.top < window.innerHeight && r.bottom > 0 : false,
            };
          });
          interactions.push(
            `Clicked hero anchor at en-1280: hash=${anchor.hash}, sectionTop=${anchor.sectionTop}, inView=${anchor.inView}`
          );
          console.log(`OK anchor click: ${JSON.stringify(anchor)}`);
        } catch (e) {
          recordFailure(`en-1280: hero anchor click failed: ${e.message}`);
        }
      }
    }
  }
} catch (e) {
  recordFailure(`unexpected capture error: ${e && e.message ? e.message : String(e)}`);
} finally {
  await browser.close();
}

const checks = {
  server: BASE,
  track_id: "www_tutor_followups_20261118",
  generated_at: new Date().toISOString(),
  viewports: WIDTHS.map((w) => ({ width: w, height: HEIGHTS[w] })),
  expected_ratio: "16:9 within 2 percent; natural 1920x1080",
  faces_and_book_visible_note:
    "Set to null by the capture client; the reviewer sets true or false after viewing each PNG.",
  captures,
  fullpage,
  aria_snapshots: ariaSnapshots,
  interactions,
  page_errors: pageErrors,
  console_errors: consoleErrors,
  failures,
};
fs.writeFileSync(path.join(OUT, "checks.json"), JSON.stringify(checks, null, 2) + "\n", "utf8");

console.log(`captures=${captures.length} fullpage=${fullpage.length} failures=${failures.length}`);
console.log(`checks.json written to ${path.join(OUT, "checks.json")}`);
if (failures.length > 0) {
  console.log("FAILED CHECKS:");
  for (const f of failures) console.log(" - " + f);
  process.exit(1);
}
console.log("ALL AUTOMATED CHECKS PASSED");
process.exit(0);
