import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const PICTURE = /^\s*!\[[^\]]*\]\([^)]*\)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const ITEM = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
const INLINE = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s](?:[^*]*[^*\s])?\*|`[^`]+`)/;

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "rule" }
  | { kind: "quote"; paragraphs: string[] }
  | { kind: "list"; ordered: boolean; items: { text: string; depth: number }[] }
  | { kind: "paragraph"; text: string };

/**
 * Removes the pictures from a guide script: the Workbooks scripts point to picture files that the app
 * does not have. A heading that only introduces a picture goes too, and the rules around it become one.
 * @param md The script Markdown.
 * @returns The script without pictures.
 */
export function scriptWithoutPictures(md: string): string {
  const lines = md.split("\n");
  const kept = lines.filter((line, i) => {
    if (PICTURE.test(line)) return false;
    if (!HEADING.test(line)) return true;
    const next = lines.slice(i + 1).find((l) => l.trim() !== "");
    return !(next && PICTURE.test(next));
  });
  return kept.join("\n").replace(/^---+[ \t]*\n(?:\s*\n)*(?=---+[ \t]*$)/gm, "");
}

/**
 * Splits the Markdown of a guide script into blocks. It reads only the Markdown that the Workbooks
 * scripts use: headings, rules, quotes, lists (nested by two spaces), and paragraphs.
 * @param md The script Markdown, without pictures.
 * @returns The blocks in order.
 */
function blocksOf(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  const starts = (line: string) => HEADING.test(line) || RULE.test(line) || line.startsWith(">") || ITEM.test(line);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const heading = HEADING.exec(line);
    if (!line.trim()) i++;
    else if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
    } else if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i++;
    } else if (line.startsWith(">")) {
      const inner: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) inner.push(lines[i++].replace(/^>\s?/, ""));
      const paragraphs = inner.join("\n").split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
      blocks.push({ kind: "quote", paragraphs });
    } else if (ITEM.test(line)) {
      const items: { text: string; depth: number }[] = [];
      const ordered = /\d/.test(ITEM.exec(line)![2]);
      while (i < lines.length && lines[i].trim()) {
        const item = ITEM.exec(lines[i]);
        if (item) items.push({ text: item[3], depth: Math.min(2, Math.floor(item[1].length / 2)) });
        else if (/^\s{2,}/.test(lines[i]) && items.length) items[items.length - 1].text += ` ${lines[i].trim()}`;
        else break;
        i++;
      }
      blocks.push({ kind: "list", ordered, items });
    } else {
      const text: string[] = [];
      while (i < lines.length && lines[i].trim() && !starts(lines[i])) text.push(lines[i++].trim());
      blocks.push({ kind: "paragraph", text: text.join(" ") });
    }
  }
  return blocks;
}

/**
 * Renders the bold, italic, and code marks of one line of a guide script.
 * @param text The line.
 * @returns The line as React nodes.
 */
function inline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    if (part.startsWith("***")) return <strong key={i}><em>{part.slice(3, -3)}</em></strong>;
    if (part.startsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

const DEPTH = ["", "ml-5", "ml-10"];

/**
 * The full script of one guide step (the Workbooks Markdown), as headings, the teacher's lines as quotes,
 * lists, and paragraphs. The pictures of the script do not show (the app does not have the files).
 * @param props.md The script Markdown.
 * @returns The script.
 */
export function GuideScript({ md }: { md: string }) {
  return (
    <div className="space-y-2 px-3 pb-3 text-sm" data-guide-script>
      {blocksOf(scriptWithoutPictures(md)).map((block, i) => {
        switch (block.kind) {
          case "heading":
            return block.level === 1 ? (
              <h5 key={i} className="text-base font-bold">{inline(block.text)}</h5>
            ) : (
              <h6 key={i} className="pt-2 font-semibold">{inline(block.text)}</h6>
            );
          case "rule":
            return <hr key={i} className="my-3" />;
          case "quote":
            return (
              <blockquote key={i} className="space-y-1 border-l-2 pl-3">
                {block.paragraphs.map((p, j) => <p key={j}>{inline(p)}</p>)}
              </blockquote>
            );
          case "list": {
            const List = block.ordered ? "ol" : "ul";
            return (
              <List key={i} className={cn("space-y-0.5 pl-5", block.ordered ? "list-decimal" : "list-disc")}>
                {block.items.map((item, j) => <li key={j} className={DEPTH[item.depth]}>{inline(item.text)}</li>)}
              </List>
            );
          }
          case "paragraph":
            return <p key={i}>{inline(block.text)}</p>;
        }
      })}
    </div>
  );
}
