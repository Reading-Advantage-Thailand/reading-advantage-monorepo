"use client";
SelectStory;
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import { articleShowcaseType } from "@/types";
import { useCurrentLocale } from "@/locales/client";
import { Skeleton } from "./ui/skeleton";
import StoryShowcaseCard from "./stories-showcase-card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "./ui/scroll-area";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";

type Props = {
  user: {
    level: number;
    name: string;
    id: string;
    role: string;
  };
};

async function fetchStories(params: string) {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/stories?${params}`
  );
  const data = await response.json();
  return data;
}

export default function SelectStory({ user }: Props) {
  const t = useScopedI18n("components.select");
  const ta = useScopedI18n("components.article");
  const locale = useCurrentLocale();
  const tf: string | any = useScopedI18n("selectType.types");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasMore, setHasMore] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [articleGenresData, setArticleGenresData] = React.useState<string[]>(
    []
  );
  const [subgenres, setSubgenres] = React.useState<string[]>([]);
  const [articleShowcaseData, setArticleShowcaseData] = React.useState<
    articleShowcaseType[]
  >([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const observer = React.useRef<IntersectionObserver | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Filter states for teachers and above
  const [date, setDate] = useQueryState("date", { defaultValue: "" });
  const [rating, setRating] = useQueryState("rating");
  const [filterGenre, setFilterGenre] = useQueryState("genre", {
    defaultValue: "",
  });
  const [level, setLevel] = useQueryState(
    "level",
    parseAsArrayOf(parseAsString)
  );
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>([]);

  const isTeacherOrAbove =
    user.role === "TEACHER" || user.role === "ADMIN" || user.role === "SYSTEM";

  const selectedGenre = searchParams.get("genre");
  const selectedSubgenre = searchParams.get("subgenre");

  const isLevelSelected = (value: string): boolean => {
    return selectedLevels.includes(value) ? true : false;
  };

  const handleLevelChange = (value: string) => {
    if (!selectedLevels.includes(value)) {
      setSelectedLevels((prev) => [...prev, value]);
      setLevel([...selectedLevels, value]);
    } else {
      const referencedArray = [...selectedLevels];
      const indexOfItemToBeRemoved = referencedArray.indexOf(value);
      referencedArray.splice(indexOfItemToBeRemoved, 1);
      setSelectedLevels(referencedArray);
      setLevel(referencedArray);
    }
  };

  const handleApplyFilters = () => {
    setArticleShowcaseData([]);
    setPage(1);
    setHasMore(true);
    setRefreshKey((prev) => prev + 1);
  };

  function getArticleCategory() {
    if (!selectedGenre && !selectedSubgenre) return "genre";
    if (selectedGenre && !selectedSubgenre) return "subGenre";
    return "article";
  }

  async function handleButtonClick(value: string) {
    const params = new URLSearchParams(window.location.search);

    if (!params.has("genre")) {
      params.set("genre", value);
    } else if (!params.has("subgenre")) {
      params.set("subgenre", value);
    }

    // Reset state before navigation
    setPage(1);
    setHasMore(true);
    setArticleShowcaseData([]);
    setLoading(true);

    router.push("?" + params.toString(), { scroll: false });
  }

  React.useEffect(() => {
    setPage(1);
    setHasMore(true);
    setArticleShowcaseData([]);
  }, [selectedGenre, selectedSubgenre]);

  React.useEffect(() => {
    async function fetchData() {
      if (!hasMore) return;

      try {
        setLoading(true);
        const params = new URLSearchParams(window.location.search);

        // Always set type to fiction for stories
        if (!params.has("type")) {
          params.set("type", "fiction");
        }

        params.set("page", page.toString());
        params.set("limit", "8");

        const response = await fetchStories(params.toString());

        if (page === 1) {
          setArticleShowcaseData(response.results);
          // Get unique subgenres from stories
          if (selectedGenre && !selectedSubgenre) {
            const uniqueSubgenres = Array.from(
              new Set(response.results.map((story: any) => story.subgenre))
            ) as string[];
            setSubgenres(uniqueSubgenres);
          }
        } else {
          // Filter out duplicates when appending new results
          setArticleShowcaseData((prev) => {
            const existingIds = new Set(prev.map((article) => article.id));
            const newArticles = response.results.filter(
              (article: articleShowcaseType) => !existingIds.has(article.id)
            );
            return [...prev, ...newArticles];
          });
        }

        setTotalPages(response.totalPages);
        if (page >= response.totalPages) {
          setHasMore(false);
        }

        setArticleGenresData(response.selectionGenres);
      } catch (error) {
        console.error("Error fetching stories:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedGenre, selectedSubgenre, page, hasMore, refreshKey]);

  const lastArticleRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || !hasMore || page >= totalPages) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore, page, totalPages]
  );

  return (
    <Card id="onborda-articles" className="my-2">
      <CardHeader>
        <CardTitle>
          {t("articleChoose", {
            article: <b>{ta(getArticleCategory())}</b>,
          })}
        </CardTitle>
        <CardDescription>
          {t("articleChooseDescription", {
            level: <b>{user.level}</b>,
            article: <b>{ta(getArticleCategory())}</b>,
          })}
        </CardDescription>
      </CardHeader>
      {/* Filter section for teachers and above */}
      {isTeacherOrAbove && (
        <div className="px-6 pb-4">
          <div className="flex flex-col gap-4">
            <div className="md:flex grid grid-cols-2 gap-4">
              {/* Sort by Date */}
              <div>
                <span className="font-bold text-sm">Sort by Date</span>
                <Select value={date} onValueChange={(value) => setDate(value)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Sort by Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {/* Filter by Rating */}
              <div>
                <span className="font-bold text-sm">Filter by Rating</span>
                <Select
                  value={rating || ""}
                  onValueChange={(value) => setRating(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="5">5⭐️⭐️⭐️⭐️⭐️</SelectItem>
                      <SelectItem value="4">4⭐️⭐️⭐️⭐️</SelectItem>
                      <SelectItem value="3">3⭐️⭐️⭐️</SelectItem>
                      <SelectItem value="2">2⭐️⭐️</SelectItem>
                      <SelectItem value="1">1⭐️</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {/* Filter by Genre */}
              <div>
                <span className="font-bold text-sm">Filter by Genre</span>
                <Select
                  value={filterGenre}
                  onValueChange={(value) => setFilterGenre(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Filter by Genre" />
                  </SelectTrigger>
                  <SelectContent className="h-60">
                    <SelectGroup>
                      <SelectLabel>Fiction</SelectLabel>
                      <SelectSeparator />
                      <SelectItem value="Children's Fiction">
                        Children&lsquo;s Fiction
                      </SelectItem>
                      <SelectItem value="Young Adult Fiction">
                        Young Adult Fiction
                      </SelectItem>
                      <SelectItem value="Science Fiction">
                        Science Fiction
                      </SelectItem>
                      <SelectItem value="Horror">Horror</SelectItem>
                      <SelectItem value="Literary Fiction">
                        Literary Fiction
                      </SelectItem>
                      <SelectItem value="Mystery/Thriller">
                        Mystery/Thriller
                      </SelectItem>
                      <SelectItem value="Contemporary Fiction">
                        Contemporary Fiction
                      </SelectItem>
                      <SelectItem value="War">War</SelectItem>
                      <SelectItem value="Westerns">Westerns</SelectItem>
                      <SelectItem value="Adult Fiction">
                        Adult Fiction
                      </SelectItem>
                      <SelectItem value="Fantasy">Fantasy</SelectItem>
                      <SelectItem value="Historical Fiction">
                        Historical Fiction
                      </SelectItem>
                      <SelectItem value="Romance">Romance</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {/* Filter by CEFR Level */}
              <div>
                <p className="font-bold text-sm">Filter by CEFR Level</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Filter by CEFR Level</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-0">
                    <ScrollArea className="h-40">
                      {["Pre-A1", "A1", "A2", "B1", "B2", "C1", "C2"].map(
                        (lvl) => (
                          <DropdownMenuCheckboxItem
                            key={lvl}
                            onSelect={(e) => e.preventDefault()}
                            checked={isLevelSelected(lvl)}
                            onCheckedChange={() => handleLevelChange(lvl)}
                          >
                            {lvl}
                          </DropdownMenuCheckboxItem>
                        )
                      )}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-end gap-4">
                <Button onClick={handleApplyFilters}>Apply</Button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CardContent>
        {loading && page === 1 ? (
          <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
            {Array.from({ length: 8 }).map((_: unknown, index: number) => (
              <Skeleton key={index} className="h-80 w-full" />
            ))}
          </div>
        ) : selectedGenre && !selectedSubgenre && !isTeacherOrAbove ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("genre");
                  router.push("?" + params.toString());
                }}
                disabled={loading}
              >
                {t("back")}
              </Button>
              {subgenres.map((subgenre) => (
                <Button
                  key={subgenre}
                  onClick={() => handleButtonClick(subgenre)}
                  disabled={loading}
                >
                  {tf(subgenre)}
                </Button>
              ))}
            </div>
            {articleShowcaseData.length > 0 ? (
              <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
                {articleShowcaseData.map((article, index) => {
                  const isLastArticle =
                    index === articleShowcaseData.length - 1;
                  return (
                    <StoryShowcaseCard
                      ref={isLastArticle ? lastArticleRef : null}
                      key={article.id}
                      story={article}
                      userId={user.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-center items-center w-full mt-4">
                <p className="text-gray-500 text-lg">
                  There are no stories in this category.
                </p>
              </div>
            )}
          </>
        ) : selectedGenre && selectedSubgenre && !isTeacherOrAbove ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("subgenre");
                  router.push("?" + params.toString());
                }}
                disabled={loading}
              >
                ← Back
              </Button>
            </div>
            {articleShowcaseData.length > 0 ? (
              <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
                {articleShowcaseData.map((article, index) => {
                  const isLastArticle =
                    index === articleShowcaseData.length - 1;
                  return (
                    <StoryShowcaseCard
                      ref={isLastArticle ? lastArticleRef : null}
                      key={article.id}
                      story={article}
                      userId={user.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-center items-center w-full mt-4">
                <p className="text-gray-500 text-lg">
                  There are no articles in this category.
                </p>
              </div>
            )}
          </>
        ) : !isTeacherOrAbove ? (
          <>
            <div className="flex flex-wrap gap-2">
              {articleGenresData.map((genre, index) => (
                <Button
                  key={index}
                  onClick={() => handleButtonClick(genre)}
                  disabled={loading}
                >
                  {tf(genre)}
                </Button>
              ))}
            </div>
            {articleShowcaseData.length > 0 ? (
              <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
                {articleShowcaseData.map((article, index) => {
                  const isLastArticle =
                    index === articleShowcaseData.length - 1;
                  return (
                    <StoryShowcaseCard
                      ref={isLastArticle ? lastArticleRef : null}
                      key={article.id}
                      story={article}
                      userId={user.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-center items-center w-full mt-4">
                <p className="text-gray-500 text-lg">
                  There are no articles in this category.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            {articleShowcaseData.length > 0 ? (
              <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
                {articleShowcaseData.map((article, index) => {
                  const isLastArticle =
                    index === articleShowcaseData.length - 1;
                  return (
                    <StoryShowcaseCard
                      ref={isLastArticle ? lastArticleRef : null}
                      key={article.id}
                      story={article}
                      userId={user.id}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex justify-center items-center w-full mt-4">
                <p className="text-gray-500 text-lg">
                  There are no articles in this category.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
