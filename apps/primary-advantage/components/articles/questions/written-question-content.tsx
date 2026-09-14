"use client";

import { QuizContext } from "@/contexts/question-context";
import { useContext, useState, useTransition } from "react";
import {
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAQuestion } from "@/types";
import { SAQuestion, SAQFeedback } from "@/types";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ActivityType } from "@/types/enum";
import { useRouter } from "@/i18n/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Icons } from "@/components/icons";
import { finishQuiz, getFeedback } from "@/actions/question";
import { useLocale, useTranslations } from "next-intl";
import { convertLocaleFull } from "@/lib/utils";
import { useSession } from "@reading-advantage/auth-client";
import { useAuth } from "@reading-advantage/auth-client";
import { Input } from "@/components/ui/input";

interface FeedbackData {
  detailedFeedback: {
    [key: string]: {
      areasForImprovement: string;
      examples: string;
      strengths: string;
      suggestions: string;
    };
  };
  scores: {
    [key: string]: number;
  };
  overallImpression: string;
  exampleRevisions: string;
  nextSteps?: string[];
  answer?: string;
}

/** Translation function type returned by useTranslations. */
type TranslateFn = ReturnType<typeof useTranslations>;

/** Answer input affordance for a written-question kind. */
export type WrittenQuestionInput = "textarea" | "input";

/** Feedback modal variant for a written-question kind. */
export type WrittenQuestionModal = "categories" | "summary";

/**
 * Input for building a kind-specific finishQuiz payload.
 */
export interface WrittenFinishInput {
  /** Feedback returned by getFeedback. */
  feedback: FeedbackData | SAQFeedback | null;
  /** Question text. */
  question: string;
  /** Suggested answer (short answer only). */
  suggestedAnswer?: string;
  /** User's submitted answer. */
  yourAnswer: string;
  /** Elapsed quiz timer. */
  timer: number;
}

/**
 * Per-kind configuration driving the parameterized written-question view.
 * Holds the feedback fetch shape, validation rules, label keys, and finish
 * payload for one written-question kind.
 */
export interface WrittenQuestionConfig {
  /** Activity reported to getFeedback and finishQuiz. */
  activityType: ActivityType;
  /** Title key in the Question namespace. */
  titleKey: string;
  /** Class for the title element. */
  titleClassName: string;
  /** Class for the question description element. */
  descriptionClassName: string;
  /** Answer input affordance. */
  input: WrittenQuestionInput;
  /** Minimum answer length for the user's level. */
  minLength: (level: number) => number;
  /** Maximum answer length, when the kind caps it. */
  maxLength?: number;
  /** Validation message for an answer below the minimum. */
  minMessage: (t: TranslateFn, level: number) => string;
  /** Validation message for an answer above the maximum. */
  maxMessage: string;
  /** Preferred feedback language for the active locale. */
  preferredLanguage: (locale: string) => string;
  /** Whether the feedback request includes the suggested response. */
  includeSuggestedResponse: boolean;
  /** Whether to pause the quiz timer before requesting feedback. */
  pauseBeforeFeedback: boolean;
  /** Builds the kind-specific finishQuiz payload. */
  buildFinishData: (input: WrittenFinishInput) => {
    question?: string;
    suggestedAnswer?: string;
    feedback?: string;
    yourAnswer?: string;
    score?: number;
    responses?: string[];
    timer?: number;
  };
  /** Success toast message on quiz finish. */
  successMessage: (t: TranslateFn) => string;
  /** Whether success and error toasts use rich colors. */
  useRichColors: boolean;
  /** Whether to refresh auth state after finishing the quiz. */
  refreshAuthOnFinish: boolean;
  /** Whether the kind uses the revise (feedback/submit method) flow. */
  hasReviseFlow: boolean;
  /** Feedback modal variant. */
  modal: WrittenQuestionModal;
}

/**
 * Per-kind configs for the written-question content.
 * Long answer keeps the textarea, level-scaled minimum, and category modal;
 * short answer keeps the input, one-character minimum, and summary modal.
 */
export const WRITTEN_QUESTION_CONFIGS: Record<
  WrittenQuestionKind,
  WrittenQuestionConfig
> = {
  la: {
    activityType: ActivityType.LA_QUESTION,
    titleKey: "LAQuestion.title",
    titleClassName: "text-3xl font-bold md:text-3xl",
    descriptionClassName: "text-2xl md:text-2xl",
    input: "textarea",
    minLength: (level) => level * 30,
    maxLength: 2000,
    minMessage: (_t, level) =>
      `Please Enter minimum ${level * 30} character...`,
    maxMessage: "Answer must be less than 2000 characters...",
    preferredLanguage: (locale) => convertLocaleFull(locale),
    includeSuggestedResponse: false,
    pauseBeforeFeedback: false,
    buildFinishData: (input) => ({
      feedback: JSON.stringify(input.feedback),
      score: Object.values(
        (input.feedback as FeedbackData | null)?.scores ?? {},
      ).reduce((acc, curr) => acc + curr, 0),
      question: input.question,
      yourAnswer: input.yourAnswer,
      timer: input.timer,
    }),
    successMessage: () => "Quiz finished",
    useRichColors: false,
    refreshAuthOnFinish: false,
    hasReviseFlow: true,
    modal: "categories",
  },
  sa: {
    activityType: ActivityType.SA_QUESTION,
    titleKey: "SAQuestion.title",
    titleClassName: "text-3xl font-bold md:text-2xl",
    descriptionClassName: "md:text-1xl text-2xl",
    input: "input",
    minLength: () => 1,
    minMessage: (t) => t("SAQuestion.anwserError"),
    maxMessage: "",
    preferredLanguage: () => "en",
    includeSuggestedResponse: true,
    pauseBeforeFeedback: true,
    buildFinishData: (input) => ({
      ...(input.feedback as SAQFeedback),
      question: input.question,
      suggestedAnswer: input.suggestedAnswer,
      yourAnswer: input.yourAnswer,
      timer: input.timer,
    }),
    successMessage: (t) => t("descriptionSuccess"),
    useRichColors: true,
    refreshAuthOnFinish: true,
    hasReviseFlow: false,
    modal: "summary",
  },
};

/**
 * Written-answer question kind.
 */
export type WrittenQuestionKind = "la" | "sa";

function WrittenQuestionView({
  kind,
  articleId,
  questions,
}: {
  kind: WrittenQuestionKind;
  articleId: string;
  questions: LAQuestion | SAQuestion;
}) {
  const config = WRITTEN_QUESTION_CONFIGS[kind];
  const { timer, setPaused } = useContext(QuizContext);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const { user } = useSession();
  const { refresh } = useAuth();
  const router = useRouter();
  const [feedback, setFeedback] = useState<FeedbackData | SAQFeedback | null>(
    null,
  );
  const [isPanding, startTransition] = useTransition();
  const locale = useLocale();
  const t = useTranslations("Question");
  const tc = useTranslations("Components");
  const tfq = useTranslations("Question.LAQuestion.feedbackModal");

  const level = (user?.level as number) ?? 0;

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(selectedCategory === category ? "" : category);
  };

  let answerField = z
    .string()
    .trim()
    .min(config.minLength(level), {
      message: config.minMessage(t, level),
    });
  if (config.maxLength !== undefined) {
    answerField = answerField.max(config.maxLength, {
      message: config.maxMessage,
    });
  }
  const answerSchema = z.object({
    answer: answerField,
    method: z.string(),
  });

  const form = useForm<z.infer<typeof answerSchema>>({
    resolver: zodResolver(answerSchema),
    defaultValues: {
      answer: "",
      method: "feedback",
    },
  });

  const handleSubmit = (value: z.infer<typeof answerSchema>) => {
    if (config.pauseBeforeFeedback) {
      setPaused(true);
    }
    startTransition(async () => {
      await getFeedback({
        data: {
          articleId: questions.articleId,
          question: questions.question,
          ...(config.includeSuggestedResponse
            ? { suggestedResponse: (questions as SAQuestion).answer }
            : {}),
          answer: value.answer,
          preferredLanguage: config.preferredLanguage(locale),
        },
        activityType: config.activityType,
      }).then((res) => {
        setFeedback(res as unknown as FeedbackData & SAQFeedback);
        setOpenModal(true);
      });
    });
  };

  const handleFinishQuiz = async () => {
    setPaused(true);
    const data = config.buildFinishData({
      feedback,
      question: questions.question,
      suggestedAnswer: (questions as SAQuestion).answer,
      yourAnswer: form.getValues("answer"),
      timer: timer,
    });

    startTransition(async () => {
      await finishQuiz(articleId, data, config.activityType).then(
        async (res) => {
          if (res.success) {
            if (config.useRichColors) {
              toast.success(config.successMessage(t), { richColors: true });
            } else {
              toast.success(config.successMessage(t));
            }
            setOpenModal(false);
            if (config.refreshAuthOnFinish) {
              await refresh();
            }
            router.refresh();
          } else {
            if (config.useRichColors) {
              toast.error(res.error, { richColors: true });
            } else {
              toast.error(res.error);
            }
          }
        },
      );
    });
  };

  return (
    <CardContent>
      <Form {...form}>
        <form
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <div className="flex items-end gap-2">
            <Badge className="flex-1 justify-start" variant="destructive">
              {tc("timer", { elapsed: timer })}
            </Badge>
          </div>
          <CardTitle className={config.titleClassName}>
            {t(config.titleKey)}
          </CardTitle>
          <CardDescription className={config.descriptionClassName}>
            {questions?.question}
          </CardDescription>
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  {config.input === "textarea" ? (
                    <TextareaAutosize
                      {...field}
                      placeholder="Type your answer here..."
                      className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full resize-none rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] outline-none focus:outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    />
                  ) : (
                    <Input {...field} />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {config.hasReviseFlow ? (
            <div className="flex space-x-2">
              <Button
                type="submit"
                disabled={isPanding || form.getValues("method") === "submit"}
                size={"sm"}
              >
                {isPanding && form.getValues("method") === "feedback" && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tc("getFeedback")}
              </Button>
              <Button
                type="submit"
                size={"sm"}
                disabled={isPanding || form.getValues("method") === "feedback"}
              >
                {isPanding && form.getValues("method") === "submit" && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tc("submitButton")}
              </Button>
            </div>
          ) : (
            <div>
              <Button
                type="submit"
                disabled={isPanding}
                variant={"outline"}
                size={"sm"}
              >
                {isPanding && (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                )}
                {tc("submitButton")}
              </Button>
            </div>
          )}

          {config.modal === "categories" ? (
            <AlertDialog open={openModal} onOpenChange={setOpenModal}>
              <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader className="text-left">
                  <AlertDialogTitle className="text-2xl font-bold">
                    {form.getValues("method") === "feedback"
                      ? "Feedback and your score"
                      : "Final Feedback and your score"}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    className="rounded-full"
                    size="sm"
                    onClick={() => handleCategoryChange("vocabularyUse")}
                    variant={
                      selectedCategory === "vocabularyUse"
                        ? "default"
                        : "outline"
                    }
                  >
                    {tfq("vocabulary")}
                  </Button>
                  <Button
                    className="rounded-full"
                    size="sm"
                    onClick={() => handleCategoryChange("grammarAccuracy")}
                    variant={
                      selectedCategory === "grammarAccuracy"
                        ? "default"
                        : "outline"
                    }
                  >
                    {tfq("grammar")}
                  </Button>
                  <Button
                    className="rounded-full"
                    size="sm"
                    onClick={() => handleCategoryChange("clarityAndCoherence")}
                    variant={
                      selectedCategory === "clarityAndCoherence"
                        ? "default"
                        : "outline"
                    }
                  >
                    {tfq("clarityandcoherence")}
                  </Button>
                  <Button
                    className="rounded-full"
                    size="sm"
                    onClick={() =>
                      handleCategoryChange("complexityAndStructure")
                    }
                    variant={
                      selectedCategory === "complexityAndStructure"
                        ? "default"
                        : "outline"
                    }
                  >
                    {tfq("complexityandstructure")}
                  </Button>
                  <Button
                    className="rounded-full"
                    size="sm"
                    onClick={() => handleCategoryChange("contentAndDevelopment")}
                    variant={
                      selectedCategory === "contentAndDevelopment"
                        ? "default"
                        : "outline"
                    }
                  >
                    {tfq("contentanddevelopment")}
                  </Button>
                </div>
                {selectedCategory &&
                  (feedback as FeedbackData)?.detailedFeedback && (
                    <>
                      <div className="text-muted-foreground flex flex-col gap-2 text-sm">
                        <div>
                          <h1 className="text-lg">
                            {tfq("areaforimpovement")}
                          </h1>

                          {
                            (feedback as FeedbackData)?.detailedFeedback[
                              selectedCategory
                            ]?.areasForImprovement
                          }
                        </div>
                        <div>
                          <h1 className="text-lg">{tfq("examples")}</h1>
                          {
                            (feedback as FeedbackData)?.detailedFeedback[
                              selectedCategory
                            ]?.examples
                          }
                        </div>
                        <div>
                          <h1 className="text-lg">{tfq("strength")}</h1>

                          {
                            (feedback as FeedbackData)?.detailedFeedback[
                              selectedCategory
                            ]?.strengths
                          }
                        </div>
                        <div>
                          <h1 className="text-lg">{tfq("suggestions")}</h1>

                          {
                            (feedback as FeedbackData)?.detailedFeedback[
                              selectedCategory
                            ]?.suggestions
                          }
                        </div>
                        <div>
                          <p className="inline font-bold text-green-500 dark:text-green-400">
                            {tfq("score")} :{" "}
                            {
                              (feedback as FeedbackData)?.scores[
                                selectedCategory
                              ]
                            }
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                {!selectedCategory && (
                  <div className="flex flex-grow flex-col gap-2 overflow-y-auto pr-4">
                    <p className="text-bold text-xl">
                      {tfq("feedbackoverall")}
                    </p>
                    <p className="text-sm">
                      {(feedback as FeedbackData)?.overallImpression}
                    </p>

                    {form.getValues("method") === "feedback" ? (
                      <>
                        <p className="text-bold text-xl">
                          {tfq("examplerevisions")}
                        </p>
                        <p className="text-sm">
                          {(feedback as FeedbackData)?.exampleRevisions}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-bold text-xl">{tfq("nextStep")}</p>
                        <div className="text-sm">
                          {(feedback as FeedbackData)?.nextSteps?.map(
                            (item, index) => (
                              <p key={index}>
                                {index + 1}.{item}
                              </p>
                            ),
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <AlertDialogFooter className="flex-shrink-0">
                  {form.getValues("method") === "feedback" ? (
                    <Button
                      onClick={() => {
                        form.setValue("method", "submit");
                        setOpenModal(false);
                        setSelectedCategory("");
                      }}
                    >
                      {tfq("reviseResponse")}
                    </Button>
                  ) : (
                    <Button
                      disabled={isPanding}
                      onClick={() => handleFinishQuiz()}
                    >
                      {tfq("getXP")}
                    </Button>
                  )}
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog open={openModal} onOpenChange={setOpenModal}>
              <AlertDialogContent className="sm:max-w-[425px]">
                <AlertDialogHeader className="text-left">
                  <AlertDialogTitle className="text-2xl font-bold">
                    {t("SAQuestion.feedbackAndYourScore")}
                  </AlertDialogTitle>
                  <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground mt-4 text-lg font-bold">
                      {t("SAQuestion.question")}
                    </p>
                    <p className="text-muted-foreground">
                      {questions.question}
                    </p>
                    <p className="text-muted-foreground mt-4 text-lg font-bold">
                      {t("SAQuestion.suggestedAnswer")}
                    </p>
                    <p className="text-muted-foreground">
                      {(questions as SAQuestion).answer}
                    </p>
                    <p className="text-muted-foreground mt-4 text-lg font-bold">
                      {t("SAQuestion.feedback")}
                    </p>
                    <p className="text-muted-foreground">
                      {(feedback as SAQFeedback)?.feedback}
                    </p>
                    <p className="text-muted-foreground mt-4 text-lg font-bold">
                      {t("SAQuestion.yourAnswer")}
                    </p>
                    <p className="mt-2 inline font-bold text-green-500 dark:text-green-400">
                      {form.getValues("answer")}
                    </p>
                  </div>
                </AlertDialogHeader>
                <div className="flex items-center">
                  <p className="mt-4 text-lg font-bold">
                    {t("SAQuestion.score", {
                      score: (feedback as SAQFeedback)?.score ?? 0,
                    })}
                  </p>
                </div>
                <AlertDialogFooter>
                  <Button onClick={handleFinishQuiz}>{tc("closeButton")}</Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </form>
      </Form>
    </CardContent>
  );
}

/**
 * Renders the long-answer or short-answer question content.
 * @param kind Whether to show the long-answer or short-answer flow.
 * @param articleId Article the question belongs to.
 * @param questions Question data for the active index.
 * @param currentIndex Active question index.
 * @returns The written question content.
 */
export function WrittenQuestionContent({
  kind,
  articleId,
  questions,
}: {
  kind: WrittenQuestionKind;
  articleId: string;
  questions: LAQuestion | SAQuestion;
}) {
  return (
    <WrittenQuestionView
      kind={kind}
      articleId={articleId}
      questions={questions}
    />
  );
}

export default WrittenQuestionContent;
