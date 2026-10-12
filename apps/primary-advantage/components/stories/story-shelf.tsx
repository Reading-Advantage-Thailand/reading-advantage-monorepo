import { useTranslations } from "next-intl";
import type { StoryCard } from "@reading-advantage/domain/stories";
import { Link } from "@/i18n/navigation";
import { getStoryImageUrl } from "@/lib/storage-config";
import { StoryCover } from "./story-cover";

/** A wood plank under the books (the continuous shelf board of the cell row). */
function Plank() {
  return (
    <div
      aria-hidden
      className="h-4 rounded-sm"
      style={{
        background: "linear-gradient(180deg,var(--cq-wood-light),var(--cq-wood) 55%,var(--cq-wood-dark))",
        boxShadow: "0 6px 0 rgba(0,0,0,.35)",
      }}
    />
  );
}

/**
 * The books on the shelf: 2 on a row at phone width, 4 on a row on a wide screen. Each book
 * links to its story page and stands on a plank.
 * @param props.stories The story cards of the page.
 * @returns The shelf.
 */
export function StoryShelf({ stories }: { stories: StoryCard[] }) {
  const t = useTranslations("Stories");
  return (
    <ul className="grid grid-cols-2 gap-x-0 gap-y-6 xl:grid-cols-4" aria-label={t("shelf")}>
      {stories.map((story) => (
        <li key={story.id} className="flex flex-col gap-1 px-2">
          <Link
            href={`/student/read/stories/${story.id}`}
            className="flex min-h-12 flex-col gap-1 text-[#fff4dc] no-underline"
          >
            <span className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-md border-[3px] border-[#5c391a] bg-[#3b2410] shadow-[4px_0_0_#3b2410,0_8px_14px_rgba(0,0,0,.5)]">
              <StoryCover src={getStoryImageUrl({ id: story.id, image: story.imageKey })} />
              {story.raLevel !== null ? (
                <span className="absolute top-1 left-1 rounded bg-[#2a2117]/85 px-1.5 py-0.5 text-[11px] font-bold">
                  {t("level", { level: story.raLevel })}
                </span>
              ) : null}
            </span>
            <span className="line-clamp-2 min-h-9 text-sm leading-tight font-bold [text-shadow:0_2px_0_rgba(0,0,0,.6)]">
              {story.title}
            </span>
            {story.genre ? (
              <span className="min-h-4 text-[11px] opacity-90 [text-shadow:0_1px_0_rgba(0,0,0,.6)]">{story.genre}</span>
            ) : null}
          </Link>
          <Plank />
        </li>
      ))}
    </ul>
  );
}
