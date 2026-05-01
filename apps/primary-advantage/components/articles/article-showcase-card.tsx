"use client";
import React from "react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "../ui/badge";
import { usePathname } from "@/i18n/navigation";
import { ArticleShowcase } from "@/types";
import StarRating from "../ui/rating";
import { useLocale, useTranslations } from "next-intl";
import { getArticleImageUrl } from "@/lib/storage-config";
import { PlayIcon, XIcon } from "lucide-react";

type Props = {
  article: ArticleShowcase;
  userId?: string;
};

const ArticleShowcaseCard = React.forwardRef<HTMLDivElement, Props>(
  ({ article, userId }, ref) => {
    const locale = useLocale();
    const pathName = usePathname();
    const router = useRouter();
    const t = useTranslations("Article");
    const systemPathRegex = /\/(?:[a-z]{2}\/)?system\/.*\/?$/i;
    const [isToggle, setIsToggle] = React.useState(false);

    // Function to get the translated summary based on locale
    const getLocalizedSummary = () => {
      if (!locale || locale === "en") {
        return article.summary;
      }

      // Map locale to translatedSummary keys
      const localeKey = locale as "th" | "cn" | "tw" | "vi";

      return article.translatedSummary?.[localeKey] || article.summary;
    };

    const handlePreviewClick = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent parent Link navigation
      e.stopPropagation(); // Stop event bubbling

      router.push(`/student/lesson/${article.id}?type=article`);
    };

    // Handle toggle click and navigate to another page
    const handleReadClick = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent parent Link navigation
      e.stopPropagation(); // Stop event bubbling

      // If toggle is active, go to lesson mode, otherwise go to read mode
      if (isToggle) {
        router.push(`/student/lesson/${article.id}?type=article`);
      } else {
        router.push(`/student/read/${article.id}`);
      }
    };

    return (
      <div>
        {/* <Link href={`/student/read/${article.id}`}> */}
        <div
          onClick={handleReadClick}
          ref={ref}
          className="flex h-[20rem] cursor-pointer flex-col gap-1 rounded-md bg-black bg-cover bg-center p-3 transition-all duration-300 hover:scale-105"
          style={{
            backgroundImage: `url('${getArticleImageUrl(article.id, 1)}')`,
            boxShadow: "inset 80px 10px 90px 10px rgba(0, 0, 0, 0.9)",
            opacity:
              article.is_read ||
              (article.is_approved && systemPathRegex.test(pathName))
                ? 0.3
                : 1,
          }}
        >
          <div className="flex justify-between">
            <div className="flex flex-col gap-2">
              {article.raLevel && (
                <Badge className="max-w-max shadow-lg" variant="destructive">
                  {t("raLevel", { level: article.raLevel ?? 0 })}
                </Badge>
              )}
              <Badge className="max-w-max shadow-lg" variant="destructive">
                {t("cefrLevel", { level: article.cefrLevel ?? 0 })}
              </Badge>
              <Badge className="max-w-max shadow-lg" variant="destructive">
                <StarRating initialRating={article.rating} readOnly />
              </Badge>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsToggle(!isToggle);
                }}
                className="cursor-pointer"
              >
                {isToggle ? (
                  <XIcon className="h-6 w-6 text-red-500" />
                ) : (
                  <PlayIcon className="h-6 w-6 fill-white stroke-white" />
                )}
              </div>
              {isToggle && (
                <Badge
                  onClick={handlePreviewClick}
                  className="max-w-max cursor-pointer shadow-lg"
                  variant="destructive"
                >
                  <PlayIcon className="h-4 w-4 fill-white stroke-white" />
                  {t("studyAsLesson", { default: "Study as 45-min Lesson" })}
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="bg-black/40">
              <p className="text-xl font-bold text-white drop-shadow-lg">
                {article.title}
              </p>
            </div>
            <div className="bg-black/40">
              <div className="line-clamp-4 text-sm text-white drop-shadow-lg">
                <p>{getLocalizedSummary()}</p>
              </div>
            </div>
          </div>
        </div>
        {article.is_read && !article.is_completed && (
          <div className="flex justify-center">
            <Badge className="text-md relative -top-[11rem] right-0 left-0 m-auto max-w-max bg-slate-200 text-slate-900 shadow-lg">
              Started
            </Badge>
          </div>
        )}

        {article.is_read && article.is_completed && (
          <div className="flex justify-center">
            <Badge className="text-md relative -top-[11rem] right-0 left-0 m-auto max-w-max bg-slate-200 text-slate-900 shadow-lg">
              Completed
            </Badge>
          </div>
        )}

        {article.is_approved && systemPathRegex.test(pathName) && (
          <div className="flex justify-center">
            <Badge className="text-md relative -top-[11rem] right-0 left-0 m-auto max-w-max bg-slate-200 text-slate-900 shadow-lg">
              Approved
            </Badge>
          </div>
        )}
        {/* </Link> */}
      </div>
    );
  },
);

ArticleShowcaseCard.displayName = "ArticleShowcaseCard";

export default React.memo(ArticleShowcaseCard);
