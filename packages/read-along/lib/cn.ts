import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names with clsx and tailwind-merge.
 *
 * The copy is local, so the package needs no app path and no built workspace package.
 * @param inputs The class values to merge.
 * @returns One class string, with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
