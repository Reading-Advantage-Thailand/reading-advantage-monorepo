import typeGenre from "../../../data/type-genre.json";
import { ArticleBaseCefrLevel, ArticleType } from "../../models/enum";

export interface RandomSelectGenreParams {
  type: ArticleType;
}

export interface randomSelectGenreResponse {
  genre: string;
  subgenre: string;
}

interface GenreDBType {
  id: string;
  subgenres: string[];
  name: string;
}

async function fetchGenresFromFile(type: ArticleType) {
  const genres = typeGenre[type.toLowerCase() as keyof typeof typeGenre];
  if (!genres) {
    throw new Error(`No genres found for type: ${type}`);
  }

  const genre = genres[Math.floor(Math.random() * genres.length)];
  return {
    subgenre: genre.subgenres[Math.floor(Math.random() * genre.subgenres.length)],
    genre: genre.name,
  };
}

export async function randomSelectGenre(
  params: RandomSelectGenreParams
): Promise<randomSelectGenreResponse> {
  try {
    return await fetchGenresFromFile(params.type);
  } catch (error) {
    throw new Error(`failed to fetch genre: ${error}`);
  }
}
