import { useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { checkStoryCompletion } from "./check-story-completion";

const completionToastShown = new Set<string>();

export function useStoryCompletion() {
  const checkAndNotifyCompletion = useCallback(
    async (userId: string, storyId: string, chapterNumber: string) => {
      try {
        const completion = await checkStoryCompletion(userId, storyId, chapterNumber);

        if (completion.allCompleted && !completion.wasAlreadyCompleted) {
          const completionKey = `${userId}-${storyId}-${chapterNumber}`;

          if (!completionToastShown.has(completionKey)) {
            completionToastShown.add(completionKey);

            toast({
              title: "🎉 Story Chapter Completed!",
              description:
                "Congratulations! You have completed all questions for this story chapter. Your progress has been saved!",
              duration: 5000,
            });

            setTimeout(() => {
              completionToastShown.delete(completionKey);
            }, 10000);
          }

          return {
            ...completion,
            justCompleted: true,
          };
        }

        return {
          ...completion,
          justCompleted: false,
        };
      } catch (error) {
        console.error("Error checking story completion:", error);
        return {
          mcqCompleted: false,
          saqCompleted: false,
          laqCompleted: false,
          allCompleted: false,
          justCompleted: false,
        };
      }
    },
    []
  );

  return { checkAndNotifyCompletion };
}
