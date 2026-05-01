# AUTONOMOUS MEASURE — DAILY BLOG & VIDEO GENERATION

This prompt runs unattended every morning on a cron loop. Your goal is to advance the marketing track by generating exactly ONE day's worth of blog content and its accompanying video.

1. **Load Context:**
   - Load the `measure` skill.
   - Read `measure/tracks.md` and navigate to the active track: `blog_marketing_phase2_20260501`.
   - Read the track's `spec.md` and `plan.md`.
   - Read `measure/marketing_plan_day_31_to_60.md` to reference the specific marketing topic for the next day.
   - Read `measure/lessons-learned.md` to ensure you avoid past mistakes (e.g., mmx text truncation in Thai, using `---` in markdown bodies, etc.).

2. **Identify Next Task:**
   - Scan `measure/tracks/blog_marketing_phase2_20260501/plan.md`.
   - Identify the NEXT specific day (between Day 31 and 60) that has NOT been generated yet. You can look at the existing files in `src/app/[locale]/(marketing)/blog/posts/en/` or the status checkboxes in the plan to determine where we left off.

3. **Execute ONE Day's Content:**
   You MUST generate exactly ONE day's worth of content (e.g., just Day 31, or just Day 32) to ensure the automated run completes within the time limits.
   - Use the `mmx` tools (`create-text-mmx`, `create-image-mmx`) to generate:
     a) **English blog post** markdown.
     b) **Thai blog post** markdown (validate length to prevent truncation).
     c) **Social hooks** (e.g., for Facebook/LinkedIn/TikTok).
     d) **Hero image** (16:9) saved to `public/blog/`.
     e) **Segments JSON** (`<slug>-segments.json`) containing 8-10 segments for the video. Save this file directly next to the Thai markdown post in `src/app/[locale]/(marketing)/blog/posts/th/`.
   - **Render the Video:** Run the video generation pipeline (e.g., `bun run scripts/generate-blog-video.ts`) for that specific day's post to generate the TikTok-style vertical video in `public/videos/`.

4. **Verify:**
   - Ensure the generated markdown files have correct YAML frontmatter.
   - Ensure there are NO horizontal rules (`---`) in the markdown body (causes validation errors).
   - Ensure the Thai text is complete and not truncated.
   - Verify the image and the `.mp4` video files exist and are the correct size/duration.
   - Run `npm run build` to ensure the new files did not introduce any compilation or layout errors, and that all localization keys and image paths resolve correctly.

5. **Finalize and Update Plan:**
   - Mark the day's generation as completed `[x]` in the track's `plan.md`.
   - Commit all changes with a descriptive git commit message (e.g., `feat(marketing): Generate Day X blog and video`).
   - Execute `git push` to push the commit to the remote repository. **This is critical so that the site redeploys and the blog post goes live.**

CRITICAL UNATTENDED RULES:
- Never wait for human input. Always make a decision and continue.
- Do not attempt to generate multiple days in one run. Only do ONE day.
- Always verify the generated output before committing. If `mmx` fails, attempt to regenerate before giving up.