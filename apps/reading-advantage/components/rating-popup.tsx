"use client";

import React from "react";
import { Rating, Stack } from "@mui/material";
import { useScopedI18n } from "@/locales/client";
import { toast } from "./ui/use-toast";
import { Article } from "./models/article-model";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "./models/user-activity-log-model";
import { useRouter } from "next/navigation";
import { submitRating } from "@/actions/rating";

interface RateDialogProps {
  disabled?: boolean;
  averageRating: number;
  userId: string;
  articleId: string;
  article: Article;
  /** rating เก่าของ user สำหรับบทความนี้ (resolve มาจาก server แล้ว) */
  initialRating?: number;
}

export default function RatingPopup({
  disabled = false,
  averageRating,
  userId,
  articleId,
  article,
  initialRating = 0,
}: RateDialogProps) {
  const t = useScopedI18n("components.rate");
  const [value, setValue] = React.useState<number | null>(-1);
  const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  // initialRating มาจาก server — ไม่ต้อง fetch client-side อีกต่อไป
  const [oldRating, setOldRating] = React.useState(initialRating);
  const [localAverageRating, setLocalAverageRating] = React.useState(averageRating);
  const [localInitialRating, setLocalInitialRating] = React.useState(initialRating);
  const [isMounted, setIsMounted] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const onUpdateUser = async () => {
    if (value === -1 || value === null) return;
    setLoading(true);

    // Optimistic update
    setLocalInitialRating(value);
    setModalIsOpen(false);

    const xpEarned = value !== 0 && localInitialRating === 0 ? 10 : 0;
    toast({
      title: t("toast.success"),
      imgSrc: true,
      description: xpEarned > 0 ? `Congratulations!, You received ${xpEarned} XP for completing this activity.` : "Rating updated.",
    });

    try {
      await submitRating(userId, articleId, value, article);
      // Fetch new average rating
      const res = await fetch(`/api/v1/articles/${articleId}`);
      const data = await res.json();
      setLocalAverageRating(data.article.average_rating);
    } catch (error) {
      // Rollback
      setLocalInitialRating(localInitialRating);
      toast({
        title: "Error",
        description: "Failed to submit rating.",
      });
    }
    setLoading(false);
  };

  const handleChange = (
    _event: React.ChangeEvent<{}>,
    newValue: number | null
  ) => {
    setValue(newValue ? newValue : 0);
  };

  const toggleModal = async () => {
    setModalIsOpen(!modalIsOpen);
    await fetch(`/api/v1/users/${userId}/activitylog`, {
      method: "POST",
      body: JSON.stringify({
        articleId: articleId,
        activityType: "article_rating",
        activityStatus: "in_progress",
        details: {
          title: article.title,
          raLevel: article.ra_level,
          cefr_level: article.cefr_level,
        },
      }),
    });
  };

  return (
    <div id="onborda-rating">
      <div
        className="sm:pl-[4.0%] pl-6 mt-4 py-2 font-bold text-3xl
    flex sm:flex-row flex-wrap gap-4 items-center border-[1px] 
    dark:border-[#1e293b] border-gray-300 rounded-xl
  "
      >
        <h1 onClick={toggleModal} className="cursor-pointer">
          Rate this article
        </h1>
        <div onClick={toggleModal} className="cursor-pointer">
          {isMounted ? (
            <Rating
              value={localAverageRating}
              onChange={handleChange}
              precision={0.5}
              size="large"
              className="dark:bg-white py-1 px-4 rounded-xl"
              readOnly
            />
          ) : (
            <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          )}
        </div>
      </div>

      {/* modal */}
      {modalIsOpen ? (
        <div
          className="w-full h-screen top-0 right-0 fixed 
        z-40 bg-white bg-opacity-80 dark:bg-black dark:bg-opacity-80"
        >
          <div className="flex h-screen justify-center items-center">
            <div
              className=" bg-white px-4 w-[450px]
             rounded-2xl py-6 shadow-2xl dark:bg-[#1e293b]"
            >
              <div
                className="flex justify-between mb-2 mx-4 
            "
              >
                <h1 className="font-bold text-xl">{t("title")}</h1>
                <button
                  onClick={() => setModalIsOpen(false)}
                  className="text-xl font-semibold -mt-4 p-1"
                >
                  x
                </button>
              </div>
              <p className="mx-4">{t("content")}</p>
              <div className="flex justify-center mt-6">
                <Rating
                  // sx={{
                  //   // change unselected color
                  //   "& .MuiRating-iconEmpty": {
                  //     color: "#f6a904",
                  //   },
                  // }}
                  value={value}
                  onChange={handleChange}
                  precision={0.5}
                  size="large"
                  className="dark:bg-white py-2 px-4 rounded-xl"
                />
              </div>
              <div className="mt-6 mx-4 flex justify-end items-end">
                <button
                  onClick={onUpdateUser}
                  className="bg-black text-white px-4 py-2 rounded-md 
              shadow-sm dark:bg-white dark:text-[#1e293b]"
                >
                  {t("submitButton")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
}
