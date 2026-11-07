import Link from "next/link";

/**
 * The 403 page of the teacher routes (design section 2, AC-4.6).
 *
 * A family session and a class session get this page on a teacher route. The page holds no week
 * content and no teacher line; it names the teacher sign-in and keeps the scanned path, so the
 * teacher signs in and comes back to the same page.
 *
 * The page takes its words as props, so a server render and a plain HTML render both work.
 */

/**
 * Renders the 403 page of a session that may not open the teacher routes.
 * @param props.heading The heading of the page.
 * @param props.line The line under the heading.
 * @param props.link The text of the link to the sign-in page.
 * @param props.href The path of the sign-in page.
 * @returns The 403 page.
 */
export default function TeacherForbidden({
  heading,
  line,
  link,
  href,
}: {
  heading: string;
  line: string;
  link: string;
  href: string;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{heading}</h1>
      <p className="leading-7">{line}</p>
      <Link href={href} className="w-fit underline">
        {link}
      </Link>
    </main>
  );
}
