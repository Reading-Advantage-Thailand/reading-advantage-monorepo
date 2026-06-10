/**
 * Base error for all article domain errors.
 */
export class ArticleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArticleError";
  }
}

/**
 * Thrown when an article is not found.
 */
export class ArticleNotFoundError extends ArticleError {
  constructor(id: string) {
    super(`Article not found: ${id}`);
    this.name = "ArticleNotFoundError";
  }
}
