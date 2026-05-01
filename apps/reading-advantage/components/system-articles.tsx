"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { CaretSortIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import { useScopedI18n } from "@/locales/client";
import ArticleShowcaseCard from "./article-showcase-card";
import { ScrollArea } from "./ui/scroll-area";

interface CustomCheckboxProps {
  label: string;
  selected: boolean;
  onSelectionChange: (label: string) => void;
}

type Passage = {
  searchTerm: string;
  id: string;
  title: string;
  type: string;
  ra_level: string;
  genre: string;
  subgenre: string;
  is_read: boolean;
  cefr_level: string;
  summary: string;
  average_rating: number;
  created_at: string;
  is_approved: boolean;
};

type PassagesProps = {
  fetchMoreData: (
    lastDocId: string | null,
    articleType: string,
    articleGenre: string,
    articleSubgenre: string,
    articleLevel: string,
    articleSearchTerm: string
  ) => Promise<{
    passages: Passage[];
    hasMore: boolean;
    lastDocId: string | null;
  }>;
};

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  label,
  selected,
  onSelectionChange,
}) => {
  return (
    <div
      className={`border-2 ${
        selected ? "bg-primary text-white" : "border-gray-300"
      } p-2 m-1 cursor-pointer w-[40px]`}
      onClick={() => onSelectionChange(label)}
    >
      {label}
    </div>
  );
};

export default function System({ fetchMoreData }: PassagesProps) {
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSubgenre, setSelectedSubgenre] = useState("");
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filteredPassages, setFilteredPassages] = useState<Passage[]>([]);
  const [prevSelectedGenre, setPrevSelectedGenre] = useState(selectedGenre);
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState("");

  const [passages, setPassages] = useState<Passage[]>([]);
  let currentItems = passages;
  const t = useScopedI18n("components.articleRecordsTable");
  const tp = useScopedI18n("components.passages");
  const [sortOption, setSortOption] = useState("");
  const [sortOrder, setSortOrder] = useState("Ascending");
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef(null);
  const FICTION = "fiction";
  const NON_FICTION = "nonfiction";
  const [docId, setDocId] = useState("");
  const articleType = type;
  const articleGenre = selectedGenre;
  const articleSubgenre = selectedSubgenre;
  const articleLevels = selectedLevels.join(",");
  const articleSearchTerm = searchTerm;
  const [debouncedArticleSearchTerm, setDebouncedArticleSearchTerm] =
    useState(articleSearchTerm);

  useEffect(() => {
    // Set a timeout to update the debounced value after 500ms
    const handler = setTimeout(() => {
      setDebouncedArticleSearchTerm(articleSearchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(handler);
    };
  }, [articleSearchTerm]);

  // Use debouncedArticleSearchTerm for fetching articles or other operations
  useEffect(() => {
    if (debouncedArticleSearchTerm) {
      // console.log("Fetching articles for term:", debouncedArticleSearchTerm);
      fetchData(
        docId,
        articleType,
        articleGenre,
        articleSubgenre,
        articleLevels,
        debouncedArticleSearchTerm
      );
    }
  }, [debouncedArticleSearchTerm]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    fetchData(
      docId,
      articleType,
      articleGenre,
      articleSubgenre,
      articleLevels,
      debouncedArticleSearchTerm
    );
    setLoading(false);
  };

  const fetchData = async (
    docId: string,
    articleType: string | "",
    articleGenre: string | "",
    articleSubgenre: string | "",
    articleLevels: string | "",
    articleSearchTerm: string | ""
  ) => {
    const moreItems = (await fetchMoreData(
      docId,
      articleType,
      articleGenre,
      articleSubgenre,
      articleLevels,
      articleSearchTerm
    )) as {
      lastDocId: string;
      passages: Passage[];
      hasMore: boolean;
    };
    setDocId(moreItems.lastDocId);
    if (Array.isArray(moreItems.passages)) {
      setPassages((prevItems) => {
        // Create a new Set with ids of previous items for faster lookup
        const prevIds = new Set(prevItems.map((item) => item.id));
        // Filter out new items that already exist in prevItems by their id
        const newUniqueItems = moreItems.passages.filter(
          (item) => !prevIds.has(item.id)
        );
        // Return the new array combining previous items with new unique items
        return [...prevItems, ...newUniqueItems];
      });
      setHasMore(moreItems.hasMore);
    }
  };

  useEffect(() => {
    fetchData(
      docId,
      articleType,
      articleGenre,
      articleSubgenre,
      articleLevels,
      debouncedArticleSearchTerm
    ).catch((error) => {
      console.error;
    });
  }, [
    articleType,
    articleGenre,
    articleSubgenre,
    articleLevels,
    debouncedArticleSearchTerm,
  ]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Check if the sentinel is intersecting
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMore();
        }
      },
      {
        root: null, // observing intersections relative to the viewport
        rootMargin: "0px",
        threshold: 1.0, // trigger when 100% of the sentinel is visible
      }
    );

    // Observe the sentinel element
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    // Cleanup
    return () => {
      if (sentinelRef.current) {
        observer.unobserve(sentinelRef.current);
      }
      observer.disconnect();
    };
  }, [loadMore, sentinelRef]); // Dependencies

  const handleSortChange = useCallback(
    (value: React.SetStateAction<string>) => {
      setSortOption(value);
      setSortOrder((prevOrder) =>
        prevOrder === "Ascending" ? "Descending" : "Ascending"
      );
    },
    []
  );

  const handleSelectionChange = useCallback((level: string) => {
    setSelectedLevels((prevLevels) =>
      prevLevels.includes(level)
        ? prevLevels.filter((l) => l !== level)
        : [...prevLevels, level]
    );
  }, []);

  const getSubgenres = (selectedGenre: string) => {
    let subgenresData: Set<string> = new Set();
    filteredPassages.forEach((passage) => {
      if (passage.genre === selectedGenre) subgenresData.add(passage.subgenre);
    });
    return Array.from(subgenresData);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setType((prevType) =>
      prevType === event.target.value ? "" : event.target.value
    );
  };

  const sortPassages = (passages: any[]) => {
    return (passages || []).sort((a, b) => {
      if (sortOption === "rating") {
        return sortOrder === "Ascending"
          ? a.average_rating - b.average_rating
          : b.average_rating - a.average_rating;
      } else if (sortOption === "date") {
        return sortOrder === "Ascending"
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return 0;
      }
    });
  };

  const filterPassages = (
    currentItems: Passage[],
    searchTerm: string,
    type: string,
    selectedGenre: string,
    selectedSubgenre: string,
    selectedLevels: string[]
  ) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const lowerCaseType = type.toLowerCase();
    const lowerCaseSelectedGenre = selectedGenre.toLowerCase();
    const lowerCaseSelectedSubgenre = selectedSubgenre.toLowerCase();

    const filteredItems = (currentItems || []).filter((passage) => {
      const titleMatch =
        !searchTerm ||
        passage.title.toLowerCase().includes(lowerCaseSearchTerm);
      const typeMatch =
        !type ||
        passage.type.toLowerCase() ===
          (lowerCaseType === FICTION ? FICTION : NON_FICTION);
      const genreMatch =
        !selectedGenre ||
        passage.genre.toLowerCase() === lowerCaseSelectedGenre;
      const subgenreMatch =
        !selectedSubgenre ||
        passage.subgenre.toLowerCase() === lowerCaseSelectedSubgenre;
      const levelMatch =
        selectedLevels.length === 0 ||
        selectedLevels.includes(passage.ra_level.toString());

      return (
        titleMatch && typeMatch && genreMatch && subgenreMatch && levelMatch
      );
    });
    return filteredItems;
  };

  useEffect(() => {
    if (prevSelectedGenre !== selectedGenre) {
      setSelectedSubgenre("");
    }

    let filtered = filterPassages(
      passages,
      searchTerm,
      type,
      selectedGenre,
      selectedSubgenre,
      selectedLevels
    );
    setFilteredPassages(filtered);
    setIsFiltered((currentItems || []).length !== filtered.length);
  }, [
    selectedGenre,
    currentItems,
    searchTerm,
    type,
    selectedSubgenre,
    selectedLevels,
    prevSelectedGenre,
  ]);

  useEffect(() => {
    setPrevSelectedGenre(selectedGenre);
  }, [selectedGenre]);

  return (
    <>
      <div className="flex flex-col lg:h-screen">
        <Input
          placeholder={t("search")}
          className="w-full mt-4 px-3 py-2"
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <div className="flex-grow overflow-hidden mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 h-full gap-4">
            <div className="md:pr-4 ">
              {/* sort date and rating */}
              <div className="mb-4">
                <p className="font-bold">
                  {tp("sortBy")} {sortOrder}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleSortChange("rating");
                  }}
                >
                  {tp("rating")}
                  <CaretSortIcon className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    handleSortChange("date");
                  }}
                >
                  {tp("date")}
                  <CaretSortIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Fitered by type */}
              <div className="mb-4">
                <p className="font-bold">{tp("type")}</p>
                <div className="ml-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      //value="fiction"
                      checked={type === "fiction"}
                      onCheckedChange={() => handleTypeChange}
                    />
                    <p>{tp("fiction")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      //value="nonfiction"
                      checked={type === "nonfiction"}
                      onCheckedChange={() => handleTypeChange}
                    />
                    <p>{tp("nonfiction")}</p>
                  </div>
                </div>
              </div>

              {/* Filtered by topic */}
              <div className="mb-4">
                <p className="font-bold">{tp("topic")}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost">
                      {selectedGenre || tp("selectGenre")}
                      <ChevronDownIcon className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="overflow-y-auto max-h-[300px] w-[200px]">
                    {/* {[
                      ...new Set(
                        filteredPassages.map((passages) => passages.genre)
                      ),
                    ].map((genre) => (
                      <DropdownMenuItem
                        onSelect={() => setSelectedGenre(genre)}
                        key={genre}
                      >
                        {genre}
                      </DropdownMenuItem>
                    ))} */}
                  </DropdownMenuContent>
                </DropdownMenu>
                {selectedGenre && (
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost">
                        {selectedSubgenre || tp("selectSubGenre")}
                        <ChevronDownIcon className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="overflow-y-auto max-h-[300px] w-[200px]">
                      {getSubgenres(selectedGenre).map((subgenre) => (
                        <DropdownMenuItem
                          onSelect={() => setSelectedSubgenre(subgenre)}
                          key={subgenre}
                        >
                          {subgenre}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <div className="mt-4 flex gap-2">
                  {selectedGenre && (
                    <Button
                      variant="default"
                      onClick={() => setSelectedGenre("")}
                    >
                      {tp("resetGenre")}
                    </Button>
                  )}
                  {selectedSubgenre && (
                    <Button
                      variant="default"
                      onClick={() => setSelectedSubgenre("")}
                    >
                      {tp("resetSubGenre")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtered by level */}
              <div className="">
                <p className="font-bold">{tp("level")}</p>
                <div className="grid grid-cols-7 w-full text-center">
                  {Array.from({ length: 26 }, (_, i) => i + 1).map((level) => (
                    <CustomCheckbox
                      key={level}
                      label={String(level)}
                      selected={selectedLevels.includes(String(level))}
                      onSelectionChange={handleSelectionChange}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* data card */}
            <ScrollArea>
              {isFiltered ? (
                <div className="grid grid-cols-1 h-full">
                  {sortPassages(filteredPassages).map(
                    (passage: Passage, index: number) => {
                      return (
                        <div
                          key={index}
                          className="captoliza ml-4 mb-4 grid sm:grid-cols-1 grid-flow-row gap-4 "
                        >
                          <ArticleShowcaseCard
                            key={index}
                            article={passage}
                            // isSystemPathOrRole={isSystemPathOrRole}
                          />
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1">
                  {sortPassages(passages).map(
                    (passage: Passage, index: number) => {
                      return (
                        <div
                          key={index}
                          className="captoliza ml-4 mb-4 grid sm:grid-cols-1 grid-flow-row gap-4"
                        >
                          <ArticleShowcaseCard key={index} article={passage} />
                        </div>
                      );
                    }
                  )}
                </div>
              )}
              <div ref={sentinelRef}>
                {hasMore ? "Loading more articles..." : ""}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </>
  );
}
