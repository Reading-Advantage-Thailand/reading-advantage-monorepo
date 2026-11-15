# Blog post format

This file gives the format of a www blog post. Use it to write a daily post.
Track: `www_blog_rich_format_20261115`. Sample post: `blog-format-sample` (a draft).

## 1. Files

| What | Where |
| ---- | ----- |
| English post | `src/app/[locale]/(marketing)/blog/posts/en/<slug>.md` |
| Thai post | `src/app/[locale]/(marketing)/blog/posts/th/<slug>.md` |
| Images, videos, posters | `public/blog/` |

- The slug uses lower-case letters, digits, and `-` only. Example: `the-forgetting-curve`.
- The Thai file uses the same slug as the English file.

## 2. Frontmatter

```yaml
---
title: "The Forgetting Curve"
date: "2026-11-15"
excerpt: "One or two sentences for the blog list."
author: "Reading Advantage Team"
tags: ["Learning Science"]
coverImage: "/blog/the-forgetting-curve.webp"
draft: true
---
```

- `title`, `date` (`YYYY-MM-DD`), `excerpt`, and `author` are necessary.
- `tags`, `coverImage`, `readingTime`, and `product` are optional.
- `draft: true` is optional. See section 5.

## 3. Rich elements

Plain Markdown works as before: headings, paragraphs, **bold**, links, and lists.

A rich element is a fenced block. Write three back-ticks and the element name on the first line.
Write one `key: value` on each line. Write three back-ticks on the last line.

- Write each value on one line.
- The text is plain text. HTML and Markdown in a value show as typed characters.
- Keys with "(optional)" can stay out. All other keys are necessary.

### 3.1 Inline image: `figure`

Keys: `src`, `alt`, `caption` (optional).

````markdown
```figure
src: /blog/the-forgetting-curve.webp
alt: A line chart that shows how memory falls after a lesson
caption: The forgetting curve.
```
````

### 3.2 YouTube video: `youtube`

Keys: `id`, `title`, `caption` (optional).

- `id` is the 11-character video id only. In `https://www.youtube.com/watch?v=aqz-KE-bpKQ`,
  the id is `aqz-KE-bpKQ`. A full URL is not accepted.
- `title` tells screen readers what the video is.

````markdown
```youtube
id: aqz-KE-bpKQ
title: How the Mastery graph shows progress
caption: A two-minute tour.
```
````

### 3.3 Short video file: `video`

Keys: `src`, `poster`, `title`, `caption` (optional).

- `src` is an `.mp4` or `.webm` file in `public/blog/`.
- `poster` is the image that shows before the reader starts the video.
- The video starts only when the reader clicks play.

````markdown
```video
src: /blog/day45-reading-circle.mp4
poster: /blog/day45-reading-circle-poster.jpg
title: Students talk about a story in a reading circle
caption: A reading circle in Grade 4.
```
````

### 3.4 Image pair and gallery: `gallery`

Keys: `image` (2 to 6 lines), `caption` (optional).

- Each `image` line is the path, then `|`, then the alt text.
- 2 images show as a pair. 3, 5, or 6 images show in 3 columns. 4 images show in 2 columns.
- On a phone, the images show in one column.

````markdown
```gallery
image: /blog/day45-circle-1.jpg | A student reads aloud to a group
image: /blog/day45-circle-2.jpg | Two students point at a word in a book
caption: Reading circles at a partner school.
```
````

### 3.5 Pull quote: `pullquote`

Keys: `text`, `cite` (optional).

````markdown
```pullquote
text: Reading is a skill. Each day of practice makes the skill stronger.
cite: A Grade 5 teacher
```
````

### 3.6 Callout box: `callout`

Keys: `type`, `title` (optional), `text`.

- `type` is `note`, `tip`, or `warning`.
- The page shows the type label in the language of the post.

````markdown
```callout
type: tip
title: Read every day
text: Ten minutes each day helps more than one long session each week.
```
````

## 4. File rules

| File | Format | Maximum size | Path |
| ---- | ------ | ------------ | ---- |
| Image, poster | `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` | 1 MB | `/blog/...` |
| Video | `.mp4` (H.264 and AAC) or `.webm` | 10 MB | `/blog/...` |

- The file name uses lower-case letters, digits, `-`, and `_` only.
- Use an image width of 1600 px or less. A size of 300 KB or less is better.
- Use a video of 60 seconds or less. Add `-movflags +faststart` when you make an mp4 with ffmpeg.
- The file must be in `public/blog/`. A path to another site or another folder is not accepted.

## 5. Draft flag

- `draft: true` hides the post on the live site. The post is not in the blog list, the page count,
  or the related posts. Its URL gives "page not found".
- In development (`pnpm dev`), the draft post shows, so you can check it.
- To publish the post, remove the `draft` line, or set `draft: false`.
- Put the flag in the English file and in the Thai file. Each file has its own flag.

## 6. Check a post

1. Start the site: `pnpm --filter www-reading-advantage dev`.
2. Open `http://localhost:3000/en/blog/<slug>`.
3. Run the post tests: `pnpm --filter www-reading-advantage exec vitest run src/lib/blog-draft.test.ts`.

A wrong key, a wrong path, a missing file, or a file that is too large stops the build. The error
names the element and the problem, for example:
`Blog block "youtube": the id "abc" is not an 11-character YouTube video id.`
In development, the post gives "page not found", and the terminal shows the error.
