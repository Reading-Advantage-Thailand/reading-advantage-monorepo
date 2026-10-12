import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const BASE = "/student/read/stories";
const SIGN = "cq-sign cq-sign--small min-h-12 inline-flex items-center whitespace-nowrap no-underline";

/**
 * The URL of the stories list for a filter state.
 * @param state The genre, the search text, and the page; empty values are left out.
 * @returns The path with its query string.
 */
export function storiesHref(state: { genre?: string; q?: string; page?: number }): string {
  const params = new URLSearchParams();
  if (state.genre) params.set("genre", state.genre);
  if (state.q) params.set("q", state.q);
  if (state.page && state.page > 1) params.set("page", String(state.page));
  const query = params.toString();
  return query ? `${BASE}?${query}` : BASE;
}

/**
 * The search box and the genre signs. The genre signs sit in one scroll row so that the books
 * show on the first screen of a phone. It is a plain GET form: it needs no script.
 * @param props.genres The genres in the student's level window.
 * @param props.genre The selected genre, if any.
 * @param props.q The search text, if any.
 * @returns The filter panel content.
 */
export function StoryFilters({ genres, genre, q }: { genres: string[]; genre?: string; q?: string }) {
  const t = useTranslations("Stories");
  return (
    <>
      <form method="get" role="search" className="flex items-center gap-2">
        {genre ? <input type="hidden" name="genre" value={genre} /> : null}
        <label className="flex min-h-12 flex-1 items-center gap-2 rounded-lg border-2 border-[#9a7a3c] bg-white/70 px-3 text-[#2b1d0e]">
          <SearchIcon className="size-5" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            maxLength={100}
            aria-label={t("search")}
            placeholder={t("searchPlaceholder")}
            className="min-h-11 w-full bg-transparent text-base outline-none"
          />
        </label>
        <button type="submit" className="cq-btn cq-btn--gold min-h-12">
          {t("searchButton")}
        </button>
      </form>
      <nav aria-label={t("genres")} className="-mx-1 overflow-x-auto">
        <ul className="cq-signs flex-nowrap">
          <li>
            <Link
              href={storiesHref({ q })}
              aria-current={genre ? undefined : "true"}
              className={cn(SIGN, !genre && "cq-sign--active")}
            >
              {t("allGenres")}
            </Link>
          </li>
          {genres.map((name) => (
            <li key={name}>
              <Link
                href={storiesHref({ genre: name, q })}
                aria-current={genre === name ? "true" : undefined}
                className={cn(SIGN, genre === name && "cq-sign--active")}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
