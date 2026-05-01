"use client";

import React from "react";
import { Input } from "./ui/input";
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
import ArticleShowcaseCard from "./article-showcase-card";
import { useQueryState, parseAsArrayOf, parseAsInteger } from "nuqs";
import { ScrollArea } from "./ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Passage = {
  id: string;
  title: string;
  type: string;
  ra_level: string;
  genre: string;
  subgenre: string;
  cefr_level: string;
  summary: string;
  average_rating: number;
  created_at: string;
};

function HandleArticle() {
  const [title, setTitle] = useQueryState("title", { defaultValue: "" });
  const [date, setDate] = useQueryState("date", { defaultValue: "" });
  const [rating, setRating] = useQueryState("rating");
  const [type, settype] = useQueryState("type");
  const [genre, setGenre] = useQueryState("genre", { defaultValue: "" });
  const [level, setLevel] = useQueryState(
    "level",
    parseAsArrayOf(parseAsInteger)
  );
  const [selectedItems, setSelectedItems] = React.useState<number[]>([]);
  const [articles, setArticles] = React.useState<Passage[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const observer = React.useRef<IntersectionObserver | null>(null);

  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  const isOptionSelected = (value: number): boolean => {
    return selectedItems.includes(value) ? true : false;
  };

  const handleSelectChange = (value: number) => {
    if (!selectedItems.includes(value)) {
      setSelectedItems((prev) => [...prev, value]);
      setLevel([...selectedItems, value]);
    } else {
      const referencedArray = [...selectedItems];
      const indexOfItemToBeRemoved = referencedArray.indexOf(value);
      referencedArray.splice(indexOfItemToBeRemoved, 1);
      setSelectedItems(referencedArray);
      setLevel(referencedArray);
    }
  };

  // const fecthData = async () => {
  //   const res = await fetch(
  //     `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/passage?${params.toString()}`,
  //     {
  //       method: "GET",
  //     }
  //   );

  //   const data = await res.json();
  //   setArticles(data);
  // };

  // const loadMoreData = async () => {
  //   setLoading(true);
  //   if (!loading) return;
  //   const res = await fetch(
  //     `${
  //       process.env.NEXT_PUBLIC_BASE_URL
  //     }/api/v1/passage?${params.toString()}&page=${page}`,
  //     {
  //       method: "GET",
  //     }
  //   );

  //   console.log(page);

  //   const data = await res.json();
  //   setArticles((prev) => [...prev, ...data]);
  //   setPage((prev) => prev + 1);
  //   setLoading(false);
  // };

  React.useEffect(() => {
    fecthData();
  }, [page]);

  const fecthData = async () => {
    try {
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_BASE_URL
        }/api/v1/passage?${params.toString()}&page=${page}`,
        {
          method: "GET",
        }
      );

      const data = await res.json();
      setArticles((prev) => [...prev, ...data]);
    } catch (error) {
      console.error(error);
    }
  };

  // Event handler for the Apply button
  const handleApplyFilters = () => {
    setArticles([]);
    setPage(1);
    fecthData();
  };

  const lastArticleRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading]
  );

  // React.useEffect(() => {
  //   const observer = new IntersectionObserver(
  //     (entries) => {
  //       // Check if the sentinel is intersecting
  //       if (entries.some((entry) => entry.isIntersecting)) {
  //         loadMoreData();
  //       }
  //     },
  //     {
  //       root: null, // observing intersections relative to the viewport
  //       rootMargin: "0px",
  //       threshold: 1.0, // trigger when 100% of the sentinel is visible
  //     }
  //   );

  //   // Observe the sentinel element
  //   if (scrollRef.current) {
  //     observer.observe(scrollRef.current);
  //   }

  //   // Cleanup
  //   return () => {
  //     if (scrollRef.current) {
  //       observer.unobserve(scrollRef.current);
  //     }
  //     observer.disconnect();
  //   };
  // }, [scrollRef]); // Dependencies

  return (
    <div className="flex flex-col lg:h-screen gap-4 p-2">
      {/* <form className="relative w-full" action="">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value || null)}
          placeholder="Search title..."
          className="pr-9"
        />
        <Button
          variant="ghost"
          type="submit"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <Search />
        </Button>
      </form> */}
      <div className="flex flex-col overflow-hidden gap-4">
        <div className="md:flex grid grid-cols-2 gap-4">
          {/* Sort New or Older */}
          <div>
            <span className="font-bold">Sort by Date</span>
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
          {/* Sort Rating */}
          <div>
            <span className="font-bold">Filter by Rating</span>
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
          {/* Sort Type */}
          <div>
            <span className="font-bold">Filter by Type</span>
            <Select
              value={type || ""}
              onValueChange={(value) => settype(value)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="fiction">Fiction</SelectItem>
                  <SelectItem value="nonfiction">Nonfiction</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {/* Sort Genre */}
          <div>
            <span className="font-bold">Filter by Genre</span>
            <Select value={genre} onValueChange={(value) => setGenre(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by Genre" />
              </SelectTrigger>
              <SelectContent className="h-60">
                <SelectGroup>
                  {type === "fiction" && (
                    <>
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
                    </>
                  )}
                  {type === "nonfiction" && (
                    <>
                      <SelectLabel>Nonfiction</SelectLabel>
                      <SelectSeparator />
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Memoirs and Autobiographies">
                        Memoirs and Autobiographies
                      </SelectItem>
                      <SelectItem value="How-to">How-to</SelectItem>
                      <SelectItem value="Essays">Essays</SelectItem>
                      <SelectItem value="Philosophy">Philosophy</SelectItem>
                      <SelectItem value="Religion">
                        Religion and Spirituality
                      </SelectItem>
                      <SelectItem value="Business">
                        Business and Economics
                      </SelectItem>
                      <SelectItem value="Biographies">Biographies</SelectItem>
                      <SelectItem value="Health and Wellness">
                        Health and Wellness
                      </SelectItem>
                      <SelectItem value="Career Guides">
                        Career Guides
                      </SelectItem>
                      <SelectItem value="Travel">Travel</SelectItem>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Journalism">Journalism</SelectItem>
                      <SelectItem value="Children's Nonfiction">
                        Children&lsquo;s Nonfiction
                      </SelectItem>
                      <SelectItem value="Textbooks">Textbooks</SelectItem>
                      <SelectItem value="Flash Nonfiction">
                        Flash Nonfiction
                      </SelectItem>
                      <SelectItem value="Political">
                        Political and Social Sciences
                      </SelectItem>
                      <SelectItem value="Cultural">
                        Cultural Criticism
                      </SelectItem>
                      <SelectItem value="Self-help">Self-help</SelectItem>
                      <SelectItem value="Food">Food Writing</SelectItem>
                      <SelectItem value="Humor">Humor</SelectItem>
                      <SelectItem value="Crafts">Crafts and Hobbies</SelectItem>
                      <SelectItem value="Language">Language</SelectItem>
                    </>
                  )}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {/* Sort Level */}
          <div>
            <p className="font-bold">Filter by Level</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Filter by Level</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-0">
                <ScrollArea className="h-40">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <DropdownMenuCheckboxItem
                      key={index}
                      onSelect={(e) => e.preventDefault()}
                      checked={isOptionSelected(index + 1)}
                      onCheckedChange={() => handleSelectChange(index + 1)}
                    >
                      {index + 1}
                    </DropdownMenuCheckboxItem>
                  ))}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-end gap-4">
            <Button onClick={handleApplyFilters}>Apply</Button>
          </div>
          {/* <div className="flex items-end gap-4">
            <Button onClick={() => location.reload()}>Reset</Button>
          </div> */}
        </div>
        <ScrollArea>
          <div className="grid grid-cols-1">
            <div className="captoliza ml-4 mb-4 grid sm:grid-cols-2 gap-4 ">
              {articles.map((article: Passage, index: number) => {
                const isLastArticle = index === articles.length - 1;
                return (
                  <ArticleShowcaseCard
                    ref={isLastArticle ? lastArticleRef : null}
                    key={index}
                    article={article}
                  />
                );
              })}
            </div>
          </div>
          <div ref={scrollRef}>{loading ?? "Loading more articles..."}</div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default HandleArticle;
