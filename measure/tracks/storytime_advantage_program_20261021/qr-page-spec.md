Version 2, 2026-10-22: 14 changes from the Monorepo review (storytime-qr-spec-review-20261022.md) applied.

# Storytime QR page spec (release 1)

Track: storytime_advantage_program_20261021. Sources: design.md 6.2, 6.3, 9, 10.2, 10.3, 10.6.
Build: Monorepo session, apps/primary-advantage, target 2026-11-20.

## Dependencies

- `programSchema` does not exist yet. Monorepo creates it in `packages/types` with six values: primary, reading, science, math, zhongwen, storytime.

## 1. Purpose and users

- A parent and a child open the page on a phone at home. The QR code is on the printed book and the home card.
- A teacher opens the same page on the class screen.
- The page needs no login and no account.
- The page shows one Thai line for the parent: how to use the page with the child.
- The page writes no cookie and no evidence. It is a public view of the week package.

## 2. Route

- Path: `/st/<level>/<week>` at `app/[locale]/st/[level]/[week]/page.tsx`. Example: `/st/2/1`.
- The locale prefix rule is "always" and th is the default locale. The QR code prints the final URL `https://<host>/th/st/<level>/<week>`. For example: `https://<host>/th/st/2/1`.
- Existing pattern: the printed QR link `/b/<book>/<n>` at `app/[locale]/b/[book]/[n]/page.tsx`. Reuse its style. Do not reuse its lookup, which sends users to the lesson flow.
- Deep link: `?part=book|decodable|song` opens that part at once. The server page reads `?part=` from `searchParams`.
- The page returns 404 for a week that is not published or does not exist.
- The injector key is (program `storytime`, level, week).
- Public access: `/st` is not in `protectedRoutes` (`lib/route-policies.ts`). A route outside that list is public.

## 3. Page layout

- Three large tiles: read-along book, decodable book, song. Each tile shows a picture.
- Sound-first. Each tile reads its label aloud on a tap on the speaker icon or a long press. A tap on the tile opens the part.
- Each target is at least 64 px. The page has no text-only menu.
- The layout works in portrait and in landscape.
- The page works on a low-end Android phone. Keep the first load small. Load media only when the child opens a part.
- The page uses `@/components/rpg/chrome`. That component reads no session, no user, and no cookie. It works on a public route.
- New strings go in a `Storytime` namespace in `messages/*.json`. Thai and English are required. Monorepo chooses drafts or English for vi, cn, and tw.
- If vi uses the English fallback, add `Storytime` to `i18n/public-fallback.ts`.

## 4. Read-along player

- The Primary player shows controls only. It plays no audio itself.
- The page joins five parts: an `<audio>` element, `useReadAlong` (`hooks/use-read-along.ts`), `ReadAlongPassage`, `seekOrWait` (`lib/read-along/seek`), and `ReadAlongPlayer`.
- `ReadAlongPlayer` gets a new `speeds` prop. The default is the current three speeds (0.75, 1, 1.25). This page passes `[0.75, 1]`. Add tests for the prop.
- The player is `fixed` above `--bottom-nav-h`. The public page has no bottom navigation bar. The page passes a `className` that puts the player at the bottom of the screen.
- The player calls `useTranslations("Components")`. The locale layout provides it. Vi, cn, and tw must have the five player keys: previousSentence, replaySentence, stopAudio, playAudio, changeSpeed.
- The timing shape is `SentenceTimepointSchema`: sentence, startTime, endTime, words[word, start, end].
- One page of the book is one sentence. The player moves by sentence.
- One picture and one line on each page. The child moves with swipe or large arrows. The page turner is new UI.
- Mode "read it to me": the audio plays and the current word is highlighted.
- Mode "my turn": no audio plays. A tap on a word plays that word. This mode is new UI. A model exists in `components/articles/article-content.tsx`.

## 5. Decodable player

- Use the same player as section 4.
- The first page is a sounds page. It shows the element of the week and plays its sound.
- A tap on a word plays the word blended, sound by sound.

## 6. Song

- Music video: 16:9, with a poster picture and a play button.
- Karaoke cut: the lyrics with word highlighting. Each line shows its gesture name and picture.
- The child can replay the song.
- No sound plays before a tap. There is no autoplay with sound.

## 7. Home card data

- Below the tiles the page shows the home card: the Thai parent line, the 3 words, the frame, and the activity.
- Each word has a speaker icon.
- The activity is one 5-minute activity.

## 8. Data contract

The page reads these fields from the week package. Workbooks owns the `storytime-week` Zod contract.

- `meta.level`, `meta.week`, `meta.title`, `meta.status` (`draft | published`)
- `books[].kind` (`readalong | decodable`)
- `books[].pages[].text`, `.picture`, `.audio`, `.wordTimes`
- `song.video`, `song.karaoke`
- `song.lines[].text`, `.gesture`, `.picture`
- `home.thaiLine`, `home.words`, `home.frame`, `home.activity`

Rules:

- A published week has exactly one book of each `kind`.
- The page shows a week only when `meta.status` is `published`.
- `books[].pages[].wordTimes` uses the Primary `SentenceTimepointSchema` shape as is: sentence, startTime, endTime, words[word, start, end]. There is no adapter.
- Media URLs are public URLs from `getStorageUrl` (`lib/storage-config.ts`).
- Validate the package with Zod at the boundary. A bad package gives 404, not a broken page.
- The page stores no personal data. It writes no cookie and records no evidence.
- The locale layout runs `AuthProvider` (a session read), `ThemeProvider`, and `ServiceWorkerRegister`. Release 1 keeps it.

## 9. How the app gets the content

- The Workbooks repo holds the week files at `content/storytime/l<level>/w<nn>.json`. The monorepo has no `content/` folder.
- A receiving step copies the validated week JSON into the app. The Monorepo track names the path.
- The media (audio and pictures) goes to the bucket through `@reading-advantage/storage`.
- Release 1 needs no migration and no database table.
- A content change needs a deploy. This is acceptable for 8 weeks.

## 10. Code structure

- A module in `lib/storytime/` does the loading, the Zod parse, the published check, and the `?part=` check.
- The page calls that module and calls `notFound()` on a failure.
- The page renders one client component. The `/b` page does the same with `renderBookLink`.

## 11. Out of scope for release 1

- Login and QR card login
- Stars, seeds, and the pet
- Progress and evidence of any kind
- Any Chibi Sprouts cartridge
- Record-and-listen

## 12. Acceptance checks

Run each check on a real phone.

1. Scan the QR code of week 1, level 2. The page opens at `/th/st/2/1` with no login.
2. Three tiles show. Each target measures at least 64 px. A long press on a tile reads its label aloud.
3. Open `/st/2/1?part=song`. The song part opens first.
4. Open `/st/2/99`. The page returns 404.
5. Open the read-along book. Play it at 0.75 and at 1.0. Only these two speeds show. The word highlight follows the audio.
6. Use "my turn". No audio plays. A tap on a word plays that word.
7. Open the decodable book. The sounds page shows first. A tap on a word plays it blended.
8. Open the song. No sound plays before a tap. The karaoke cut shows the gesture name on each line. Rotate the phone: the layout still fits.
9. A test shows that `/st` is not in `protectedRoutes`.
