const BOOK_KEY = /^[a-z0-9-]+$/;

/**
 * Builds the Tutor Advantage lesson link for a printed book address. It fills `{book}` and `{n}`
 * in the template from a validated book key and lesson number only, and encodes both values.
 * @param opts.book The book key from the address.
 * @param opts.number The lesson number.
 * @param opts.template The URL template; it defaults to the `TUTOR_LESSON_URL_TEMPLATE` setting.
 * @returns The `https` link, or null when the setting is empty, is not `https`, or an input is invalid.
 */
export function tutorLessonUrl({ book, number, template = process.env.TUTOR_LESSON_URL_TEMPLATE }: { book: string; number: number; template?: string }): string | null {
  if (!template || !/^https:\/\/[^\s/]/i.test(template.trim())) return null;
  if (!BOOK_KEY.test(book) || !Number.isInteger(number) || number < 1) return null;
  return template.trim().replaceAll("{book}", encodeURIComponent(book)).replaceAll("{n}", encodeURIComponent(String(number)));
}
