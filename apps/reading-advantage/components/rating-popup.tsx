"use client";

import React from "react";
import { Rating, Stack } from "@mui/material";
import { useScopedI18n } from "@/locales/client";
import { toast } from "./ui/use-toast";
import { Article, StoryChapter } from "./models/article-model";
import {
  UserXpEarned,
  ActivityStatus,
  ActivityType,
} from "./models/user-activity-log-model";
import { submitRating } from "@/actions/rating";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export type RatingTarget =
  | { articleId: string; article: Article }
  | { storyId: string; chapterId: string; story: StoryChapter };

interface RateDialogProps {
  disabled?: boolean;
  averageRating: number;
  userId: string;
  target: RatingTarget;
  /** rating เก่าของ user สำหรับบทความนี้ (resolve มาจาก server แล้ว) */
  initialRating?: number;
}

export default function RatingPopup({
  disabled = false,
  averageRating,
  userId,
  target,
  initialRating = 0,
}: RateDialogProps) {
  const isChapter = "storyId" in target;
  const t = useScopedI18n(
    isChapter ? "components.rateChapter" : "components.rate"
  );
  const [value, setValue] = React.useState<number | null>(-1);
  const [modalIsOpen, setModalIsOpen] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  // initialRating มาจาก server — ไม่ต้อง fetch client-side อีกต่อไป
  const [oldRating, setOldRating] = React.useState(
    isChapter ? 0 : initialRating
  );
  const [localAverageRating, setLocalAverageRating] =
    React.useState(averageRating);
  const [localInitialRating, setLocalInitialRating] =
    React.useState(initialRating);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (isChapter) {
      ratedFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isChapter]);

  const ratedFetch = async () => {
    if (!isChapter) return;
    try {
      const ratingData = await fetch(
        `/api/v1/users/${userId}/activitylog`
      ).then((data) => data.json());

      const logs = ratingData.activityLogs || [];
      const filterRating = logs.filter(
        (data: any) =>
          (data.storyId === target.storyId ||
            data.targetId === target.storyId ||
            data.details?.storyId === target.storyId) &&
          (String(data.chapterNumber) === String(target.chapterId) ||
            String(data.details?.chapter_number) === String(target.chapterId) ||
            String(data.details?.chapterNumber) === String(target.chapterId)) &&
          data.activityType === ActivityType.ChapterRating
      );

      if (filterRating.length > 0 && filterRating[0].details?.rating) {
        setOldRating(filterRating[0].details.rating);
      } else {
        setOldRating(0);
      }
    } catch (error) {
      console.log("Error fetching rating: ", error);
      setOldRating(0);
    }
  };

  const onUpdateUser = async () => {
    if (value === -1 || value === null) return;
    setLoading(true);

    if (!isChapter) {
      const previousInitialRating = localInitialRating;
      setLocalInitialRating(value);
      setModalIsOpen(false);

      const xpEarned = value !== 0 && previousInitialRating === 0 ? 10 : 0;

      try {
        const result = await submitRating(
          userId,
          target.articleId,
          value,
          target.article
        );
        if (result.success) {
          if (typeof result.averageRating === "number") {
            setLocalAverageRating(result.averageRating);
          }
          toast({
            title: t("toast.success"),
            imgSrc: true,
            description:
              xpEarned > 0
                ? `Congratulations!, You received ${xpEarned} XP for completing this activity.`
                : "Rating updated.",
          });
        } else {
          setLocalInitialRating(previousInitialRating);
          toast({
            title: "Error",
            description: result.error ?? "Failed to submit rating.",
          });
        }
      } catch (error) {
        setLocalInitialRating(previousInitialRating);
        toast({
          title: "Error",
          description: "Failed to submit rating.",
        });
      }
      setLoading(false);
      return;
    }

    const story = target.story;
    if (value !== 0 && oldRating === 0) {
      // The three calls share no data dependency: the PUT payload carries the
      // locally chosen rating, not a value read from either POST response.
      const [ratingActivity, , readActivity] = await Promise.all([
        fetch(`/api/v1/users/${userId}/activitylog`, {
          method: "POST",
          body: JSON.stringify({
            storyId: target.storyId,
            chapterNumber: target.chapterId,
            activityType: ActivityType.ChapterRating,
            activityStatus: ActivityStatus.Completed,
            xpEarned: UserXpEarned.Chapter_Rating,
            details: {
              title: story.chapter.title,
              raLevel: story.ra_Level,
              cefr_level: story.cefr_level,
              rating: value,
            },
          }),
        }),
        fetch(`/api/v1/stories/${target.storyId}/${target.chapterId}`, {
          method: "PUT",
          body: JSON.stringify({
            rating: value,
            chapterNumber: target.chapterId,
          }),
        }),
        fetch(`/api/v1/users/${userId}/activitylog`, {
          method: "POST",
          body: JSON.stringify({
            storyId: target.storyId,
            chapterNumber: target.chapterId,
            activityType: ActivityType.ChapterRead,
            activityStatus: ActivityStatus.Completed,
            details: {
              title: story.chapter.title,
              raLevel: story.ra_Level,
              cefr_level: story.cefr_level,
              type: story.type,
              genre: story.genre,
              subgenre: story.subgenre,
            },
          }),
        }),
      ]);

      const resRatingActivity = await ratingActivity.json();
      const resReadActivity = await readActivity.json();
      if (resRatingActivity.status === 200 && resReadActivity.status === 200) {
        const count = story.chapter.user_rating_count || 0;
        setLocalAverageRating(
          (localAverageRating * count + value) / (count + 1)
        );
        setOldRating(value);
        toast({
          title: t("toast.success"),
          imgSrc: true,
          description: `Congratulations!, You received ${UserXpEarned.Chapter_Rating} XP for completing this activity.`,
        });
        setModalIsOpen(false);
      }
      setLoading(false);
    } else if (value !== 0 && oldRating !== 0) {
      await fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        body: JSON.stringify({
          storyId: target.storyId,
          chapterNumber: target.chapterId,
          activityType: ActivityType.ChapterRating,
          activityStatus: ActivityStatus.Completed,
          details: {
            title: story.chapter.title,
            raLevel: story.ra_Level,
            cefr_level: story.cefr_level,
            rating: value,
          },
        }),
      });
      const count = story.chapter.user_rating_count || 0;
      if (count > 0) {
        setLocalAverageRating(
          (localAverageRating * count + value - oldRating) / count
        );
      }
      setOldRating(value);
      toast({
        title: t("toast.success"),
        imgSrc: true,
        description: "you not earned XP.",
      });
      setModalIsOpen(false);

      setLoading(false);
    }
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
        articleId: isChapter ? target.storyId : target.articleId,
        activityType: isChapter ? "chapter_rating" : "article_rating",
        activityStatus: "in_progress",
        details: isChapter
          ? {
              title: target.story.chapter.title,
              raLevel: target.story.ra_Level,
              cefr_level: target.story.cefr_level,
            }
          : {
              title: target.article.title,
              raLevel: target.article.ra_level,
              cefr_level: target.article.cefr_level,
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
          {isChapter ? "Rate this chapter" : "Rate this article"}
        </h1>
        {isChapter ? (
          <Stack onClick={toggleModal} className="cursor-pointer">
            <Rating
              value={localAverageRating || 0}
              onChange={handleChange}
              precision={0.5}
              size="large"
              className="dark:bg-white py-1 px-4 rounded-xl"
              readOnly
            />
          </Stack>
        ) : (
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
        )}
      </div>

      <Dialog open={modalIsOpen} onOpenChange={setModalIsOpen}>
        <DialogContent className="bg-white px-4 sm:w-[450px] rounded-2xl py-6 shadow-2xl dark:bg-[#1e293b]">
          <DialogHeader>
            <DialogTitle className="font-bold text-xl text-left">
              {t("title")}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-left">
            {t("content")}
          </DialogDescription>
          <div className="flex justify-center mt-6">
            <Rating
              value={value}
              onChange={handleChange}
              precision={0.5}
              size="large"
              className="dark:bg-white py-2 px-4 rounded-xl"
            />
          </div>
          <div className="mt-6 flex justify-end items-end">
            <Button
              onClick={onUpdateUser}
              disabled={loading}
              className="bg-black text-white px-4 py-2 rounded-md 
              shadow-sm dark:bg-white dark:text-[#1e293b]"
            >
              {t("submitButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
