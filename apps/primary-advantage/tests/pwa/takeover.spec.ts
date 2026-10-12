import { expect, test } from "@playwright/test";

const BASE = `http://127.0.0.1:${process.env.PWA_FIXTURE_PORT ?? 3111}`;
const LEGACY_PRECACHE = /^serwist-precache-v2-/;

test("the new worker replaces the legacy worker and removes its caches", async ({ page, request }) => {
  // 1. The legacy worker installs, controls the page, and fills its caches.
  await page.goto(`${BASE}/`);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForFunction(async () =>
    (await caches.keys()).some((name) => name.startsWith("serwist-precache-v2-")),
  );
  await page.evaluate(async () => {
    // The legacy runtime caches fill from traffic. Seed two of them with an entry for this page.
    for (const name of ["pages", "apis"]) {
      const cache = await caches.open(name);
      await cache.put("/old-page", new Response("legacy page"));
    }
  });
  const before = await page.evaluate(() => caches.keys());
  expect(before.some((name) => LEGACY_PRECACHE.test(name))).toBe(true);
  expect(before).toEqual(expect.arrayContaining(["pages", "apis"]));
  expect(await page.evaluate(() => sessionStorage.getItem("loads"))).toBe("1");

  // 2. The app now answers with the new worker at the same URL. The page asks for an update.
  expect((await request.post(`${BASE}/__switch`)).ok()).toBe(true);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    await registration?.update();
  });

  // 3. The new worker activates, deletes the legacy caches, and the window reloads once.
  await page.waitForFunction(() => sessionStorage.getItem("loads") === "2");
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const after = await page.evaluate(() => caches.keys());
  expect(after).toEqual([]);
  const state = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    return { active: registration?.active?.state, scope: registration?.scope, waiting: Boolean(registration?.waiting) };
  });
  expect(state).toEqual({ active: "activated", scope: `${BASE}/`, waiting: false });

  // 4. A request goes to the network every time and fills no cache.
  const hits = await page.evaluate(async () => {
    await fetch("/__ping");
    await fetch("/__ping");
    return (await caches.keys()).length;
  });
  expect(hits).toBe(0);
  expect((await (await request.get(`${BASE}/__pings`)).json()).pings).toBe(2);

  // 5. A later load and a later update check do not reload any window.
  await page.reload();
  expect(await page.evaluate(() => sessionStorage.getItem("loads"))).toBe("3");
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/");
    await registration?.update();
  });
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => sessionStorage.getItem("loads"))).toBe("3");
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
});
