const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function resolveChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  for (const name of ['playwright', 'playwright-core']) {
    try {
      const candidate = require(name).chromium.executablePath();
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Playwright is optional.
    }
  }

  const cache = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (!fs.existsSync(cache)) {
    return undefined;
  }
  const revisions = fs.readdirSync(cache)
    .filter((entry) => /^chromium-\d+$/.test(entry))
    .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));
  for (const revision of revisions) {
    for (const dir of ['chrome-linux64', 'chrome-linux']) {
      const candidate = path.join(cache, revision, dir, 'chrome');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }
  return undefined;
}

module.exports = {
  skipDownload: true,
  executablePath: resolveChrome(),
};
