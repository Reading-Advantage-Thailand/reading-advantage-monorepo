# Current Directive: Daily Marketing Blog Post Generation

## Objective
Generate one marketing blog post per day from the 30-Day "Advantage" Blog Marketing Campaign.

## Source of Truth
- **Campaign plan:** `measure/marketing_plan_30_days.md`
- **Track:** `blog_marketing_generation_20260421`
- **Spec:** `measure/tracks/blog_marketing_generation_20260421/spec.md`
- **Plan:** `measure/tracks/blog_marketing_generation_20260421/plan.md`

## Daily Task
1. Identify the next unwritten day from the marketing plan (Days 1–30).
2. Generate the English blog post text (~800–1000 words) using `mmx` (`create-text-mmx` skill).
3. Generate the Thai blog post text (~800–1000 words) using `mmx` (`create-text-mmx` skill).
4. Generate one 16:9 hero image using `mmx` (`create-image-mmx` skill).
5. Save files:
   - English: `src/app/[locale]/(marketing)/blog/posts/en/{slug}.md`
   - Thai: `src/app/[locale]/(marketing)/blog/posts/th/{slug}.md`
   - Image: `public/blog/{filename}.jpg` or `.webp`
   - Frontmatter must include `product` field matching the Advantage Page in `measure/marketing_plan_30_days.md`
6. Run the validation test: `npx vitest run src/lib/blog-posts-validation.test.ts`
7. Fix any validation failures.
8. Generate the Thai video from the day's Thai markdown file:
   - `npx tsx scripts/generate-blog-video.ts "src/app/[locale]/(marketing)/blog/posts/th/{slug}.md"`
9. Verify the Thai video artifact before commit:
   - Confirm output exists in `public/videos/{thai-slug}.mp4`.
   - Confirm audio stream exists:
     - `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "public/videos/{thai-slug}.mp4"`
   - Confirm duration alignment between narration and final video is within 1.0 second.
10. Commit with a descriptive message referencing the day number and track.
11. Push to `main`.
12. Update `measure/tracks/blog_marketing_generation_20260421/plan.md` to mark the day's task as complete.

## Quality Gates
- All 102+ validation tests must pass before commit.
- Posts must include YAML frontmatter matching the existing schema.
- Both EN and TH versions must share the same slug.
- Image must exist on disk and be referenced by `coverImage` in frontmatter.
- Word count target: 800–1000 words per post.
- Thai video must be generated from the Thai post in the same run.
- Thai video must include an audio stream.
- Thai video and narration durations must be aligned (delta <= 1.0 second).

## Out of Scope
- Do not modify blog UI, routing, or rendering logic.
- Do not create more than one day's post per run.
