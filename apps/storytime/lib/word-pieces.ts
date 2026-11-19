/**
 * The word pieces of a text (plan task 6.2, round 3).
 *
 * The opening routine of the teacher lesson flow shows its prompt words. A word that holds a
 * whole clip becomes a button, and the punctuation of the word stays outside the button, so the
 * name of the button is the word alone.
 */

/** One piece of a text: a word, or the text around the words. */
export interface TextPiece {
  /** The word of the piece, with no punctuation. */
  word?: string;
  /** The plain text of the piece. */
  text?: string;
}

/** The pattern of one word of a text; spaces and punctuation stay outside the match. */
const WORD_PATTERN = /([\p{L}\p{N}][\p{L}\p{N}'’-]*)/u;

/**
 * Splits one text into its words and the text around them.
 *
 * The text of the pieces joined in order is the text of the prompt, so a button that holds a
 * word changes no character of the prompt.
 * @param text The text of the prompt.
 * @returns The pieces, in reading order.
 */
export function wordPieces(text: string): TextPiece[] {
  const tokens = text.split(WORD_PATTERN);
  const pieces: TextPiece[] = [];
  tokens.forEach((token, index) => {
    if (index % 2 === 0) {
      if (token !== "") pieces.push({ text: token });
      return;
    }
    pieces.push({ word: token });
  });
  return pieces;
}
