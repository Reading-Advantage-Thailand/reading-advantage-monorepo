import { notFound } from "next/navigation";

/**
 * Catches every unknown path under a locale and answers with the not-found page and HTTP 404
 * (manual test P5: the page drew the 404 text with status 200).
 * @returns Never; `notFound()` throws.
 */
export default function UnknownPath(): never {
  notFound();
}
