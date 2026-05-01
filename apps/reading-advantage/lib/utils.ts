import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Tokenizer from "sentence-tokenizer";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert ISO to time ago 2024-05-11T14:42:23.400Z => 2 hours ago
export function formatDate(updatedAt: string): string {
  const date = new Date(updatedAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const absDiff = Math.abs(diff);
  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(months / 12);

  const isFuture = diff < 0;

  if (years > 0) {
    return isFuture
      ? years === 1
        ? "In the next 1 year"
        : `In the next ${years} years`
      : years === 1
      ? "1 year ago"
      : `${years} years ago`;
  } else if (months > 0) {
    return isFuture
      ? months === 1
        ? "In the next 1 month"
        : `In the next ${months} months`
      : months === 1
      ? "1 month ago"
      : `${months} months ago`;
  } else if (days > 0) {
    return isFuture
      ? days === 1
        ? "In the next 1 day"
        : `In the next ${days} days`
      : days === 1
      ? "1 day ago"
      : `${days} days ago`;
  } else if (hours > 0) {
    return isFuture
      ? hours === 1
        ? "In the next 1 hour"
        : `In the next ${hours} hours`
      : hours === 1
      ? "1 hour ago"
      : `${hours} hours ago`;
  } else if (minutes > 0) {
    return isFuture
      ? minutes === 1
        ? "In the next 1 minute"
        : `In the next ${minutes} minutes`
      : minutes === 1
      ? "1 minute ago"
      : `${minutes} minutes ago`;
  } else {
    return isFuture
      ? seconds === 1
        ? "In the next 1 second"
        : `In the next ${seconds} seconds`
      : seconds === 1
      ? "1 second ago"
      : `${seconds} seconds ago`;
  }
}
export function formatTimestamp(updatedAt: {
  _seconds: number;
  _nanoseconds: number;
}): string {
  const currentDate = new Date();
  const updatedDate = new Date(updatedAt._seconds * 1000);

  const timeDifferenceInSeconds = Math.floor(
    (currentDate.getTime() - updatedDate.getTime()) / 1000
  );

  if (timeDifferenceInSeconds < 60) {
    return `${timeDifferenceInSeconds} seconds ago`;
  } else if (timeDifferenceInSeconds < 3600) {
    const minutes = Math.floor(timeDifferenceInSeconds / 60);
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  } else if (timeDifferenceInSeconds < 86400) {
    const hours = Math.floor(timeDifferenceInSeconds / 3600);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  } else {
    const days = Math.floor(timeDifferenceInSeconds / 86400);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
}

export function camelToSentenceCase(str: string) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}

/**
 * Splits the given content into sentences.
 *
 * If the content contains newline characters (\n or \\n), it replaces them with an empty string
 * and then splits the content into sentences. Otherwise, it uses a sentence tokenizer to split
 * the content into sentences.
 *
 * @param {string} content - The content to split into sentences.
 * @returns {string[]} An array of sentences.
 */
export function splitTextIntoSentences(
  content: string,
  allowEnd: boolean = false
): string[] {
  // If content contains \n
  const regex = /(\n\n|\n|\\n\\n|\\n)/g;
  if (content.match(regex)) {
    content = content.replace(regex, allowEnd ? "~~" : "");
    const sentences = content
      .split(
        /(?<!\b(?:Mr|Mrs|Dr|Ms|St|Ave|Rd|Blvd|Ph|D|Jr|Sr|Co|Inc|Ltd|Corp|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.)(?<!\b(?:Mr|Mrs|Dr|Ms|St|Ave|Rd|Blvd|Ph|D|Jr|Sr|Co|Inc|Ltd|Corp|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\./
      )
      .filter((sentence) => sentence.length > 0);

    // add . to the end of each sentence
    if (allowEnd) {
      return sentences.map((sentence) => sentence + ".");
    }
    return sentences;
  } else {
    const tokenizer = new Tokenizer();
    tokenizer.setEntry(content);
    const sentences = tokenizer.getSentences();
    return sentences;
  }
}

export function levelCalculation(xp: number): { cefrLevel: string; raLevel: number } {
  const levels = [
    { min: 0, max: 4999, cefrLevel: "A1-", raLevel: 1 },
    { min: 5000, max: 10999, cefrLevel: "A1", raLevel: 2 },
    { min: 11000, max: 17999, cefrLevel: "A1+", raLevel: 3 },
    { min: 18000, max: 25999, cefrLevel: "A2-", raLevel: 4 },
    { min: 26000, max: 34999, cefrLevel: "A2", raLevel: 5 },
    { min: 35000, max: 44999, cefrLevel: "A2+", raLevel: 6 },
    { min: 45000, max: 55999, cefrLevel: "B1-", raLevel: 7 },
    { min: 56000, max: 67999, cefrLevel: "B1", raLevel: 8 },
    { min: 68000, max: 80999, cefrLevel: "B1+", raLevel: 9 },
    { min: 81000, max: 94999, cefrLevel: "B2-", raLevel: 10 },
    { min: 95000, max: 109999, cefrLevel: "B2", raLevel: 11 },
    { min: 110000, max: 125999, cefrLevel: "B2+", raLevel: 12 },
    { min: 126000, max: 142999, cefrLevel: "C1-", raLevel: 13 },
    { min: 143000, max: 160999, cefrLevel: "C1", raLevel: 14 },
    { min: 161000, max: 179999, cefrLevel: "C1+", raLevel: 15 },
    { min: 180000, max: 199999, cefrLevel: "C2-", raLevel: 16 },
    { min: 200000, max: 220999, cefrLevel: "C2", raLevel: 17 },
    { min: 221000, max: 242999, cefrLevel: "C2+", raLevel: 18 },
  ];

  for (let level of levels) {
    if (xp >= level.min && xp <= level.max) {
      return { cefrLevel: level.cefrLevel, raLevel: level.raLevel };
    }
  }

  return { cefrLevel: "", raLevel: 0 };
}
