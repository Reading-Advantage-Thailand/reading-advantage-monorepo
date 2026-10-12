import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** One row of the chapter list; `summary` is already in the student's language. */
export interface ChapterListItem {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string | null;
  done: boolean;
}

/**
 * The chapters of a story: one 56 px row for each chapter with its number, title, summary, and a
 * green "Done" mark when the student finished it.
 * @param props.storyId The story id for the chapter links.
 * @param props.chapters The chapter rows in reading order.
 * @returns The list, or a note when the story has no chapters.
 */
export function ChapterList({ storyId, chapters }: { storyId: string; chapters: ChapterListItem[] }) {
  const t = useTranslations("Stories");
  if (!chapters.length) return <p>{t("noChapters")}</p>;
  return (
    <ul aria-label={t("chaptersSign")} className="flex flex-col gap-2">
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <Link
            href={`/student/read/stories/${storyId}/${chapter.chapterNumber}`}
            className={cn(
              "flex min-h-14 items-center gap-3 rounded-md border-2 border-[#8a6a3b] bg-[#fff4dc]/70 px-3 py-2 text-[#2a2117] no-underline",
              chapter.done && "border-[#2f7d4b]",
            )}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#5c391a] text-sm font-bold text-[#fff4dc]">
              {chapter.chapterNumber}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="sr-only">{t("chapterNumber", { n: chapter.chapterNumber })}</span>
              <span className="truncate font-bold">{chapter.title}</span>
              {chapter.summary ? <span className="line-clamp-2 text-xs opacity-80">{chapter.summary}</span> : null}
            </span>
            {chapter.done ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-[#2f7d4b] bg-[#d9f0df] px-2 py-0.5 text-xs font-bold text-[#1d4d2d]">
                <CheckIcon className="size-3.5" aria-hidden /> {t("chapterDone")}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
