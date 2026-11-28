import { spawn } from "node:child_process";
import { setTimeout } from "node:timers";
import { resolve } from "node:path";
import { chromium } from "playwright";

const [app, port, controlName] = process.argv.slice(2);
if (!app || !port) throw new Error("Usage: browser-probe.mjs <app> <port> [controlName]");
const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

const repoRoot = process.cwd();
const appRoot = resolve(repoRoot, "apps", app);
const url = `http://127.0.0.1:${port}/`;
const serverLogs = [];
const child = spawn(
  process.execPath,
  [resolve(repoRoot, "node_modules/vinext/dist/cli.js"), "start"],
  {
    cwd: appRoot,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://runtime_probe:unused@127.0.0.1:59999/marketing",
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      PORT: port,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
child.stdout.on("data", (chunk) => serverLogs.push(String(chunk)));
child.stderr.on("data", (chunk) => serverLogs.push(String(chunk)));

let browser;
try {
  let status = 0;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`vinext exited before readiness: ${serverLogs.join("")}`);
    }
    try {
      const response = await fetch(url);
      status = response.status;
      break;
    } catch {
      await delay(250);
    }
  }
  if (status !== 200) throw new Error(`root returned HTTP ${status}`);

  browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH ?? chromium.executablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const hydrationWarnings = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (/hydrat|did not match|server rendered html/i.test(message.text())) {
      hydrationWarnings.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: "networkidle" });

  const title = await page.title();
  const headingLocator = page.locator("h1").first();
  const heading = (await headingLocator.count()) > 0 ? await headingLocator.textContent() : "";
  let controlResult = "not-requested";
  if (controlName) {
    const control = page.getByRole("button", { name: controlName });
    await control.click();
    await delay(1500);
    const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
    controlResult =
      bodyText.includes("Step verified") ||
      bodyText.includes("Tutorial complete") ||
      bodyText.includes("✓ fixture.check")
        ? "visible-result"
        : "no-visible-result";
    console.log(`BODY_EXCERPT=${bodyText.slice(0, 500)}`);
  }

  console.log(`APP=${app}`);
  console.log(`BROWSER_TOOL=playwright`);
  console.log(`BROWSER_VERSION=${browser.version()}`);
  console.log(`SERVER_PID=${child.pid}`);
  console.log(`HTTP_STATUS=${status}`);
  console.log(`TITLE=${title}`);
  console.log(`H1=${heading?.trim() ?? ""}`);
  console.log(`CONSOLE_ERRORS=${consoleErrors.length}`);
  console.log(`PAGE_ERRORS=${pageErrors.length}`);
  console.log(`HYDRATION_WARNINGS=${hydrationWarnings.length}`);
  console.log(`FIXTURE_CONTROL=${controlResult}`);
  for (const message of consoleErrors) console.log(`CONSOLE_ERROR=${message}`);
  for (const message of pageErrors) console.log(`PAGE_ERROR=${message}`);
  for (const message of hydrationWarnings) console.log(`HYDRATION_WARNING=${message}`);
} finally {
  if (browser) await browser.close();
  if (child.exitCode === null) child.kill("SIGTERM");
  await delay(250);
  if (child.exitCode === null) child.kill("SIGKILL");
}
