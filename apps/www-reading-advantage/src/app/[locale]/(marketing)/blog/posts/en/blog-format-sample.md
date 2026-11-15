---
title: "Blog Format Sample: Every Rich Element"
date: "2026-11-15"
excerpt: "A draft sample post that shows each rich element of the blog format. It never shows in production."
author: "Reading Advantage Team"
tags: ["Blog Format"]
draft: true
---

This draft post shows each rich element of the blog format. The file
`docs/blog-post-format.md` gives the syntax. This post never shows in production.

## Inline image

An inline image can go anywhere in the body. The caption is optional.

```figure
src: /blog/the-forgetting-curve.webp
alt: A teenager studies flash cards at a desk under a lamp
caption: Review at the correct time keeps a new word in memory.
```

## YouTube video

The embed uses the privacy-enhanced YouTube address. It loads only when the reader scrolls to it.

```youtube
id: aqz-KE-bpKQ
title: Big Buck Bunny, a sample video
caption: A sample YouTube embed.
```

## Short video file

A short video file plays on the page. The reader sees the poster image first.

```video
src: /blog/format-sample-clip.mp4
poster: /blog/format-sample-clip-poster.jpg
title: A young traveller smiles in front of a temple
caption: A 6-second sample clip.
```

## Image pair

Two images make a pair. On a phone, the images stack.

```gallery
image: /blog/day24-the-art-of-critical-reading_001.jpg | A boy writes notes at a desk in a library
image: /blog/day20-the-science-of-curiosity_001.jpg | A girl looks into a microscope in a classroom
caption: Two images side by side.
```

## Gallery

A gallery holds 2 to 6 images.

```gallery
image: /blog/day08-stem-vs-steam_001.jpg | Two children in safety glasses do a science task and an art task
image: /blog/day09-science-of-storytelling_001.jpg | A mother reads a picture book with a young child
image: /blog/day14-math-logic_001.jpg | A boy smiles in front of a diagram of connected points
image: /blog/day19-raising-a-multilingual-child_001.jpg | Four children read books at a table
image: /blog/day25-from-user-to-creator_001.jpg | A boy uses a laptop next to building blocks
image: /blog/day27-tutors-vs-mentors_001.jpg | A teacher helps two students with their writing
caption: A gallery of six images.
```

## Pull quote

```pullquote
text: Reading is a skill. Each day of practice makes the skill stronger.
cite: A Grade 5 teacher
```

## Callouts

```callout
type: note
text: A note gives the reader more information.
```

```callout
type: tip
title: Read every day
text: Ten minutes each day helps more than one long session each week.
```

```callout
type: warning
text: A warning tells the reader about a risk.
```

## Plain Markdown

Plain Markdown still works. A **bold** word, a [link](/contact), and a list:

- The first item
- The second item
