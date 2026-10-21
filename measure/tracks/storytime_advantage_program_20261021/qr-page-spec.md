# Storytime QR page spec (release 1)

Track: storytime_advantage_program_20261021. Sources: design.md 6.2, 6.3, 9, 10.2, 10.3, 10.6.
Build: Monorepo session, apps/primary-advantage, target 2026-11-20. The same change adds `storytime` to `programSchema`.

## 1. Purpose and users

- A parent and a child open the page on a phone at home. The QR code is on the printed book and the home card.
- A teacher opens the same page on the class screen.
- The page needs no login and no account.
- The page shows one Thai line for the parent: how to use the page with the child.
- The page writes nothing. It is a public view of the week package.

## 2. Route

- Path: `/st<level>/<week>`, for example `/st2/1`. Monorepo may add a locale prefix.
- Existing pattern: the printed QR link `/b/<book>/<n>` at `app/[locale]/b/[book]/[n]/page.tsx`. Reuse its style. Do not reuse its lookup, which sends users to the lesson flow.
- The QR code encodes the full URL. There is one page for each week.
- Deep link: `?part=book|decodable|song` opens that part at once.
- The page returns 404 for a week that is not published or does not exist.
- The injector key is (program `storytime`, level, week).
- Public access: `proxy.ts` guards only the prefixes in `protectedRoutes`. A route outside that list is public. `/b/...` and the `(index)` group are public now.

## 3. Page layout

- Three large tiles: read-along book, decodable book, song. Each tile shows a picture.
- Sound-first. Each tile reads its label aloud on a tap on the speaker icon or a long press. A tap on the tile opens the part.
- Each target is at least 64 px. The page has no text-only menu.
- The layout works in portrait and in landscape.
- The page works on a low-end Android phone. Keep the first load small. Load media only when the child opens a part.

## 4. Read-along player

- Reuse the Primary player: `components/read-along/read-along-player.tsx` (`ReadAlongPlayer`, speeds in `READ_ALONG_SPEEDS` = 0.75, 1, 1.25).
- Reuse `components/read-along/read-along-passage.tsx` for word highlighting.
- Reuse `lib/read-along/` (`align.ts`, `position.ts`, `seek.ts`). The timing shape is `SentenceTimepointSchema`: sentence, startTime, endTime, words[word, start, end].
- Limit the speeds to 0.75 and 1.0 on this page.
- One picture and one line on each page. The child moves with swipe or large arrows.
- Mode "read it to me": the audio plays and the current word is highlighted.
- Mode "my turn": no audio plays. A tap on a word plays that word.
- Open question for Monorepo: the Primary player imports `@/components/rpg/chrome` and `next-intl`. Check that both work on a public route.

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

The page reads these fields from the week package. The path is `content/storytime/l<level>/w<nn>.json`.

- `meta.level`, `meta.week`, `meta.title`
- `books[].pages[].text`, `.picture`, `.audio`, `.wordTimes`
- `song.video`, `song.karaoke`
- `song.lines[].text`, `.gesture`, `.picture`
- `home.thaiLine`, `home.words`, `home.frame`, `home.activity`

Rules:

- Media is in `content/storytime/l<level>/media/w<nn>/`. The page gets media through `@reading-advantage/storage` signed or public URLs.
- Validate the package with Zod at the boundary. A bad package gives 404, not a broken page.
- The page stores no personal data. It sets no cookie and records no evidence.
- Open question: `books[]` holds the read-along book and the decodable book. Workbooks must give each book a `kind` field (`readalong` or `decodable`).

## 9. Out of scope for release 1

- Login and QR card login
- Stars, seeds, and the pet
- Progress and evidence of any kind
- Any Chibi Sprouts cartridge
- Record-and-listen

## 10. Acceptance checks

Run each check on a real phone.

1. Scan the QR code of week 1, level 2. The page opens with no login.
2. Three tiles show. Each target measures at least 64 px. A long press on a tile reads its label aloud.
3. Open `/st2/1?part=song`. The song part opens first.
4. Open `/st2/99`. The page returns 404.
5. Open the read-along book. Play it at 0.75 and at 1.0. The word highlight follows the audio.
6. Use "my turn". No audio plays. A tap on a word plays that word.
7. Open the decodable book. The sounds page shows first. A tap on a word plays it blended.
8. Open the song. No sound plays before a tap. The karaoke cut shows the gesture name on each line. Rotate the phone: the layout still fits.
