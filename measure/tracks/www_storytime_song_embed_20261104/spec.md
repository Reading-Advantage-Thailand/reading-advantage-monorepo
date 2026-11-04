# Spec — www Storytime Advantage song section

**Track ID:** `www_storytime_song_embed_20261104`
**Type:** feature (classic FR list with acceptance checks)
**Status:** new. Track files only. Opened 2026-11-04.
**Owner chain:** Daniel (owner; Thai check; zh check; look check; push gate) → Monorepo orchestrator (track owner: tests, component, page, captures) → PM orchestrator (assignment A-46; takes questions back to PR).
**PM assignment:** A-46, 2026-11-04. The PR session sent the song copy v0.2, the two posters, and the two video IDs.
**Lane:** light lane (PM 2026-11-03, rule 3): one maker, one checker later, then Daniel's look check.

## 1. Request

Daniel asked for a song section on the www Storytime Advantage page. His Google Tasks item bms4Ujg2bEQ3TFNsNlVqYg says, word for word: "Storytime Advantage www page - add song embed". His note in the hand-off says, word for word: "I uploaded the two song videos to youtube and put them in a playlist: https://www.youtube.com/watch?v=Id4_X0nQnV4 Is it possible to choose the version that is embedded based on desktop / mobile page view? That would be great if possible."

The page has no song sample today. This track adds one song section with a click-to-load player.

## 2. Sources and versions

| Source | Version | Date | Kept by |
| --- | --- | --- | --- |
| `www-song-handoff.md` (song copy, videos, defaults) | 0.2 | 2026-11-04 | PR session |
| `l2/media/w01/song-poster.jpg` (desktop poster, 1280×720) | — | 2026-11-03 | PR session |
| `l2/media/w01/song-phone-poster.jpg` (phone poster, 720×1280) | — | 2026-11-03 | PR session |
| `apps/www-reading-advantage/src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx` (live page) | HEAD `dd1c4133f` | 2026-11-04 | Monorepo |
| `apps/www-reading-advantage/src/locales/pages/products/storytime-advantage.ts` (live strings) | HEAD `dd1c4133f` | 2026-11-04 | Monorepo |

The hand-off copy file has SHA-256 `9ac0e73676aea7e080c9b146c6ba02d0c48c7b9b831b6d50cc280b18a7379fa7`. The check matched the value in `MANIFEST.txt`.

The desktop poster has SHA-256 `abef5e066eceabbd3bebab1851f5bdf1c2ac08dc220fe8e524466d68bca28b50`. The phone poster has SHA-256 `47365f3136529fc2e97da40d92d727c74bb549212b1505ebdc8aeb5d58fa0a18`. Both checks matched the values in the package `MANIFEST.txt`.

The hand-off files are read only. The build copies the bytes unchanged. The build adds no hash field to any file.

## 3. Videos

| Use | Video ID | Aspect | Length |
| --- | --- | --- | --- |
| Desktop | `Id4_X0nQnV4` | 16:9 | 85 s |
| Phone | `nwJW8yENJnY` | 9:16 | 85 s |

Both videos sit on the channel Reading Advantage. Both accept an embed. The playlist `PLGPfjnoRjWNA` stays out of the embed URL.

## 4. Song copy (quoted exactly from hand-off section (a))

| Element | English | Thai | Chinese |
|---|---|---|---|
| Heading | "The Week 1 Song" | "เพลงของสัปดาห์ที่ 1" | "第一周歌曲" |
| Text | "“Hello, I am Pip” is the song of week 1 in the first unit. Each week has its own song with a video, so children can sing along in class or at home." | "“Hello, I am Pip” เป็นเพลงของสัปดาห์ที่ 1 ในหน่วยแรก แต่ละสัปดาห์มีเพลงของตัวเองพร้อมวิดีโอ เด็กจึงร้องตามได้ทั้งในห้องเรียนและที่บ้าน" | "“Hello, I am Pip”是第一单元第一周的歌曲。每周都有自己的歌曲和视频，孩子们可以在课堂上或在家里一起唱。" |
| Play button label | "Play the song" | "เล่นเพลง" | "播放歌曲" |
| Player accessible title | "Video of the week 1 song “Hello, I am Pip”, Storytime Advantage" | "วิดีโอเพลงของสัปดาห์ที่ 1 “Hello, I am Pip” ของ Storytime Advantage" | "视频：第一周歌曲“Hello, I am Pip”，Storytime Advantage" |

The song title "Hello, I am Pip" stays in English in all three locales.

The Thai strings are Daniel's draft. They wait for his check. The Chinese strings are the PR draft. They go live with the push. A contracted Chinese speaker checks them after the push.

The copy gives no date and no price. The copy makes no learning claim.

## 5. Chinese rule (PM brief, 2026-11-04)

The locale file has `export const zh = en;`. The zh page shows the English text for every key today. This track keeps that rule for every key except the four song keys.

The zh song strings come from hand-off line 19, word for word. The rest of the zh text stays equal to en.

## 6. Page place

The song section sits in section `st-section-3` ("One Sound, One Song, Two Books a Week"). It sits between the three text columns and the picture grid. The heading and the text sit in the section. The player box sits under the text.

The page stays a server component. The player is one small client component. The component file is `apps/www-reading-advantage/src/components/products/storytime-song-player.tsx`.

## 7. Player rules

1. Before the tap, the box holds a local poster and a play button. The button carries the play button label.
2. The `<picture>` loads one poster. The phone poster loads under 768 px. The desktop poster loads from 768 px.
3. Before the tap, the page makes no request to any YouTube or Google host. The page holds no iframe, no preconnect, no thumbnail, and no script for a video host.
4. At the tap, the component reads `window.matchMedia('(max-width: 767px)').matches` once. True gives the phone video in a 9:16 box. False gives the desktop video in a 16:9 box.
5. The iframe replaces the poster in the same box. Only one player exists at any time.
6. The iframe URL is `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0&playsinline=1`.
7. The video starts on the tap. No second tap is needed.
8. The iframe carries `title` = the player accessible title, `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`, and `allowFullScreen`.
9. The play control is a real `<button>`. Enter and Space work. A focus ring shows.
10. The poster `<img>` has an empty `alt`. The button names the action.
11. The focus moves to the iframe after it loads.

## 8. Box size rules

The 9:16 box fits a 390 px wide screen and a 360 px wide screen. Neither width has horizontal overflow. The box height stays at about 80% of the screen height or less. The build limits the box width when the screen is short.

## 9. Security rules

The app has no Content-Security-Policy today. The build checks `next.config.ts`, `src/middleware.ts`, `nginx.conf`, `Dockerfile`, and `cloudbuild.yaml`. The build adds a `frame-src` source only when a policy blocks `https://www.youtube-nocookie.com`.

## 10. Acceptance checks

- AC-1: The song section sits in `st-section-3` between the three text columns and the picture grid.
- AC-2: The en, th, and zh heading and text are the copy word for word.
- AC-3: The zh song strings are the PR draft. Every other zh key stays equal to en.
- AC-4: Before the tap, the markup holds no iframe and no YouTube URL.
- AC-5: The play button carries the play button label as its accessible name. The poster `<img>` has an empty `alt`.
- AC-6: The `<picture>` holds the phone poster under 768 px and the desktop poster from 768 px.
- AC-7: The tap with `matchMedia` true gives one iframe with `nwJW8yENJnY` and a 9:16 box.
- AC-8: The tap with `matchMedia` false gives one iframe with `Id4_X0nQnV4` and a 16:9 box.
- AC-9: The iframe URL host is `www.youtube-nocookie.com` and holds `autoplay=1`.
- AC-10: The iframe title is the player accessible title.
- AC-11: Only one player exists after two taps.
- AC-12: The server HTML holds no `youtube` string.
- AC-13: The 9:16 box fits 390 px and 360 px with no horizontal overflow.
- AC-14: The page stays a server component. Every export has JSDoc.
- AC-15: The build, the ten captures, and the checks pass.

## 11. Out of scope

- The weeks 2 to 8 songs. Each week waits for Daniel's approval of its song.
- Any change to the other page sections.
- Any push, merge, or deploy. The push and the merge stay with Daniel.
- A Storytime app build.
- Any hash field in a new file.
