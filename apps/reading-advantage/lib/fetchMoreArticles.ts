"use server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

type Passage = {
  searchTerm: string;
  id: string;
  title: string;
  type: string;
  ra_level: string;
  genre: string;
  subgenre: string;
  is_read: boolean;
  is_completed?: boolean;
  cefr_level: string;
  summary: string;
  average_rating: number;
  created_at: string;
  is_approved: boolean;
};

export const fetchMoreArticles = async (
  lastDocId: string | null,
  typeParam: string,
  genreParam: string,
  subgenreParam: string,
  levelParam: string,
  searchTermParam: string
): Promise<{
  passages: Passage[];
  hasMore: boolean;
  lastDocId: string | null;
}> => {
  const user = await getCurrentUser();
  if (!user) {
    return redirect("/auth/signin");
  }
  if (user.cefr_level === "" && user.level === 0) {
    return redirect("/level");
  }

  const type = typeParam;
  const genre = genreParam;
  const subgenre = subgenreParam;
  const level = levelParam;
  const searchTerm = searchTermParam;

  try {
    const headersList = await headers();
    const headersObject = Object.fromEntries(headersList.entries());
    delete headersObject["content-length"]; // Remove 'content-length' if found
    const queryParams = new URLSearchParams({
      lastDocId: lastDocId || "",
      type,
      genre,
      subgenre,
      level,
      searchTerm,
    }).toString();

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/passage?${queryParams}`,
      {
        method: "GET",
        headers: headersObject,
      }
    );
    const res = await response.json();
    return res;
  } catch (error) {
    console.error("failed to fetch passages: ", error);
    return { passages: [], hasMore: false, lastDocId: null };
  }
};
