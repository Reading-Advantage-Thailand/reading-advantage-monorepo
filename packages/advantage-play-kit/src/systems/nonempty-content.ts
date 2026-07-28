/**
 * `capability:nonempty-content-precondition` shared core.
 *
 * Shared validation guard that owns rejection of empty or blank playable
 * content. Backend or rules constructors consume a validated nonempty
 * collection before game-specific setup. Games own error copy and all
 * sentence, vocabulary, graph, circle, or target initialization after
 * validation.
 *
 * Source evidence: abyssal-well, archers-revenge, astral-mage,
 * enchanted-library, griffin-riders-escape.
 */

/** One validated playable content item carrying a term and its translation. */
export interface NonEmptyContentItem {
  /** Source-language term or word. */
  readonly term: string;
  /** Target-language translation. */
  readonly translation: string;
}

/** Validated nonempty playable content ready for game-specific setup. */
export interface NonEmptyContent {
  /** Content kind reported so games can distinguish vocabulary from sentences. */
  readonly kind: "vocabulary" | "sentence";
  /** Nonempty, nonblank validated items. */
  readonly items: readonly NonEmptyContentItem[];
}

/**
 * Reports whether a string is empty or whitespace-only.
 * @param value The string to test.
 * @returns True when the string contains no non-whitespace characters.
 */
export function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Validates that playable content is a nonempty array of nonblank term/translation items.
 * @param input Untrusted host or test content.
 * @param kind Optional content kind; defaults to "vocabulary".
 * @returns A frozen nonempty content object.
 * @throws When the input is not a nonempty array or any entry has a blank term or translation.
 */
export function validateNonEmptyContent(
  input: unknown,
  kind: "vocabulary" | "sentence" = "vocabulary",
): NonEmptyContent {
  if (!Array.isArray(input)) {
    throw new Error("Nonempty content precondition requires an array");
  }
  if (input.length === 0) {
    throw new Error("Nonempty content precondition rejects an empty playable content array");
  }
  const items: NonEmptyContentItem[] = input.map((entry, index) => {
    if (entry === null || typeof entry !== "object") {
      throw new Error(`Nonempty content entry ${index} must be a term/translation object`);
    }
    const { term, translation } = entry as { term?: unknown; translation?: unknown };
    if (typeof term !== "string" || isBlank(term)) {
      throw new Error(`Nonempty content entry ${index} has a blank term`);
    }
    if (typeof translation !== "string" || isBlank(translation)) {
      throw new Error(`Nonempty content entry ${index} has a blank translation`);
    }
    return { term, translation };
  });
  const nonBlank = items.filter((item) => !isBlank(item.term) && !isBlank(item.translation));
  if (nonBlank.length === 0) {
    throw new Error("Nonempty content precondition rejects an array whose every entry is blank");
  }
  return Object.freeze({ kind, items: Object.freeze(items) });
}

/**
 * Asserts that playable content is nonempty without returning a copy.
 * @param input Untrusted host or test content.
 * @throws When the input is not a nonempty array of nonblank items.
 */
export function assertNonEmptyContent(input: unknown): void {
  validateNonEmptyContent(input);
}
