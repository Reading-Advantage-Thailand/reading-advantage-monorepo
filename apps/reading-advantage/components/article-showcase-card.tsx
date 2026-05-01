import React from "react";
import { Badge } from "./ui/badge";
import Link from "next/link";
import { Rating } from "@mui/material";
import { ArticleShowcase } from "./models/article-model";
import { useCurrentLocale, useScopedI18n } from "@/locales/client";
import { usePathname } from "next/navigation";

type Props = {
  article: ArticleShowcase;
  userId?: string;
};

async function getTranslateSentence(
  articleId: string,
  targetLanguage: string
): Promise<{ message: string; translated_sentences: string[] }> {
  try {
    const res = await fetch(`/api/v1/articles/${articleId}/translate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ targetLanguage }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Translation error:", error);
    return { message: "error", translated_sentences: [] };
  }
}

const ArticleShowcaseCard = React.forwardRef<HTMLDivElement, Props>(
  ({ article, userId }, ref) => {
    const [summarySentence, setSummarySentence] = React.useState<string[]>([]);
    const [playToggle, setPlayToggle] = React.useState(false);
    const locale = useCurrentLocale();
    const pathName = usePathname();
    const systemPathRegex = /\/(?:[a-z]{2}\/)?system\/.*\/?$/i;
    const t: string | any = useScopedI18n("selectType.types");

    React.useEffect(() => {
      handleTranslateSummary();
    }, [article, locale]);

    async function handleTranslateSummary() {
      const articleId = article.id;
      if (!locale || locale === "en") {
        return;
      }
      const data = await getTranslateSentence(articleId, locale);

      setSummarySentence(data.translated_sentences);
    }

    return (
      <div
        className="relative hover:scale-105 transition-all duration-300"
        ref={ref}
      >
        {/* ปุ่ม ▶ + Dropdown Menu พร้อม Animation */}
        {!article.is_read && (
          <div
            className={`group absolute top-2 right-2 z-10 transition-transform duration-300 ${
              article.is_read
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer"
            }`}
          >
            <div
              className={`text-[30px] text-white rounded transition-transform duration-300 ${
                playToggle ? "rotate-180" : "rotate-0"
              }`}
              onClick={() => setPlayToggle(!playToggle)}
            >
              {playToggle ? "❌" : "▶"}
            </div>
            <div
              className={`absolute top-full mt-2 right-0 w-max flex flex-col rounded text-sm z-20 transition-transform duration-300 gap-5 ${
                playToggle ? "translate-x-0" : "translate-x-full"
              }`}
            >
              {playToggle && (
                <div className="flex flex-col gap-2 p-2">
                  <Link
                    href={`/student/lesson/${article.id}`}
                    className="hover:bg-red-600 bg-red-800 text-[12px] font-semibold p-1 rounded-md"
                  >
                    ▶ Study as 45-min Lesson
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
        <Link href={`/student/read/${article.id}`}>
          <div
            ref={ref}
            className="w-full flex flex-col gap-1 h-[20rem] bg-cover bg-center p-3 rounded-md bg-black "
            style={{
              backgroundImage: `url('https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}.png')`,
              boxShadow: "inset 80px 10px 90px 10px rgba(0, 0, 0, 0.9)",
              opacity:
                article.is_read ||
                (article.is_approved && systemPathRegex.test(pathName))
                  ? 0.3
                  : 1,
            }}
          >
            {article.ra_level && (
              <Badge className="shadow-lg max-w-max" variant="destructive">
                Reading Advantage Level: {article.ra_level}
              </Badge>
            )}
            <Badge className="shadow-lg max-w-max" variant="destructive">
              CEFR Level: {article.cefrLevel || article.cefr_level}
            </Badge>
            <Badge className="shadow-lg max-w-max" variant="destructive">
              {t(article.genre)}, {t(article.subgenre)}
            </Badge>
            <Badge className="shadow-lg max-w-max" variant="destructive">
              <Rating
                name="read-only"
                value={article.rating || article.average_rating}
                readOnly
              />
            </Badge>
            {article.author?.name && (
              <Badge className="shadow-lg max-w-max" variant="destructive">
                Author: {article.author.name}
              </Badge>
            )}
            <div className="mt-auto">
              <div className=" bg-black bg-opacity-40">
                <p className="text-xl drop-shadow-lg font-bold text-white">
                  {article.title}
                </p>
              </div>
              <div className=" bg-black bg-opacity-40">
                <p className="text-sm drop-shadow-lg line-clamp-4 text-white">
                  {locale == "en" ? (
                    <React.Fragment>{article.summary}</React.Fragment>
                  ) : (
                    <React.Fragment>{summarySentence}</React.Fragment>
                  )}
                </p>
              </div>
            </div>
          </div>
        </Link>

        {article.is_read && !article.is_completed && (
          <div className="flex justify-center">
            <Badge className="relative m-auto -top-[11rem] text-md left-0 right-0 shadow-lg max-w-max bg-slate-200 text-slate-900">
              Started
            </Badge>
          </div>
        )}

        {article.is_read && article.is_completed && (
          <div className="flex justify-center">
            <Badge className="relative m-auto -top-[11rem] text-md left-0 right-0 shadow-lg max-w-max bg-slate-200 text-slate-900">
              Completed
            </Badge>
          </div>
        )}

        {article.is_approved && systemPathRegex.test(pathName) && (
          <div className="flex justify-center">
            <Badge className="relative m-auto -top-[11rem] text-md left-0 right-0 shadow-lg max-w-max bg-slate-200 text-slate-900">
              Approved
            </Badge>
          </div>
        )}
      </div>
    );
  }
);

ArticleShowcaseCard.displayName = "ArticleShowcaseCard";

export default React.memo(ArticleShowcaseCard);
