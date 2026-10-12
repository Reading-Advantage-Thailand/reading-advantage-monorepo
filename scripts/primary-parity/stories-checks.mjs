// Pure helpers of the stories block of cutover-check.mjs (track primary_parity_stories_20261011).
// They hold no browser code, so a node test can run them. They never see a password or a name.

/**
 * Reads the legacy story id from a story picture URL.
 * @param src An image src such as ".../images/story/<cuid>.png".
 * @returns The cuid, or "" when the src has no story key.
 */
export function cuidFromImageSrc(src) {
  return /images\/story\/([^/?#]+)\.png/.exec(src ?? "")?.[1] ?? "";
}

/**
 * Judges the redirect of the old story list URL.
 * @param pathname The path after the redirects.
 * @returns The check. The old list must open the Stories tab of Read.
 */
export function judgeOldListRedirect(pathname) {
  return [
    {
      name: "stories: old /student/stories opens the Stories tab",
      ok: /\/student\/read\/stories\/?$/.test(pathname ?? ""),
      note: pathname ?? "",
    },
  ];
}

/**
 * Judges the Stories tab.
 * @param f.text The page text.
 * @param f.storyLinks The number of story links (without the tab link).
 * @returns The checks.
 */
export function judgeStoriesTab(f) {
  return [
    {
      name: "stories: the tab sign shows Articles and Stories",
      ok: /Articles/.test(f.text ?? "") && /Stories/.test(f.text ?? ""),
      note: "",
    },
    {
      name: "stories: the shelf lists a story",
      ok: (f.storyLinks ?? 0) > 0,
      note: `${f.storyLinks ?? 0} links`,
    },
  ];
}

/**
 * Judges a story page.
 * @param f.text The page text.
 * @param f.chapterLinks The number of chapter links.
 * @returns The checks.
 */
export function judgeStoryPage(f) {
  return [
    {
      name: "stories: the story page lists the chapters",
      ok: (f.chapterLinks ?? 0) > 0,
      note: `${f.chapterLinks ?? 0} links`,
    },
    {
      name: "stories: the story page shows the Characters sign",
      ok: /Characters/.test(f.text ?? ""),
      note: "",
    },
  ];
}

/**
 * Judges a chapter page.
 * @param f.pathname The path of the chapter page.
 * @param f.text The page text.
 * @param f.passageChars The number of main-column characters.
 * @returns The checks.
 */
export function judgeChapterPage(f) {
  return [
    {
      name: "stories: the chapter opens with the read-along player",
      ok: /Listen and read along/i.test(f.text ?? ""),
      note: f.pathname ?? "",
    },
    {
      name: "stories: the chapter shows the passage",
      ok: (f.passageChars ?? 0) > 200,
      note: `${f.passageChars ?? 0} chars`,
    },
  ];
}

/**
 * Judges the redirect of an old story URL.
 * @param f.landed The path after the redirects.
 * @param f.storyPath The new story path.
 * @returns The check.
 */
export function judgeOldStoryRedirect(f) {
  return [
    {
      name: "stories: the old story URL opens the story page",
      ok: (f.landed ?? "") === (f.storyPath ?? ""),
      note: f.landed ?? "",
    },
  ];
}

/**
 * Judges the redirect of an old chapter URL.
 * @param f.landed The path after the redirects.
 * @param f.chapterPath The new chapter path.
 * @returns The check.
 */
export function judgeOldChapterRedirect(f) {
  return [
    {
      name: "stories: the old chapter URL opens the chapter page",
      ok: (f.landed ?? "") === (f.chapterPath ?? ""),
      note: f.landed ?? "",
    },
  ];
}

/**
 * Judges an unknown story id.
 * @param f.status The HTTP status of the page.
 * @param f.text The page text.
 * @returns The check. The page must be not found, with no redirect loop.
 */
export function judgeUnknownCuid(f) {
  return [
    {
      name: "stories: an unknown story id shows not found",
      ok: f.status === 404 || /could not be found|not found|404/i.test(f.text ?? ""),
      note: `status ${f.status}`,
    },
  ];
}
