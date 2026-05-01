import { ArticleType } from "@/types/enum";
import fs from "fs";
import path from "path";

export interface RandomSelectGenreParams {
  type: ArticleType;
}

export interface randomSelectGenreResponse {
  genre: string;
  subgenre: string;
}

export async function randomSelectGenre(
  params: RandomSelectGenreParams
): Promise<randomSelectGenreResponse> {
  try {
    const filePath = path.join(process.cwd(), "data", "genres.json");
    const rawData = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(rawData);

    const genreList = data[params.type];
    const randomGenre = genreList[Math.floor(Math.random() * genreList.length)];
    const randomSubgenre =
      randomGenre.subgenres[
        Math.floor(Math.random() * randomGenre.subgenres.length)
      ];

    return {
      genre: randomGenre.name,
      subgenre: randomSubgenre,
    };
  } catch (error) {
    throw new Error(`failed to fetch genre: ${error}`);
  }
}
