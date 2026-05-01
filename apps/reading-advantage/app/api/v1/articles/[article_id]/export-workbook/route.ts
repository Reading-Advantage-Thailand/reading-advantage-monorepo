import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEdgeRouter } from "next-connect";
import { logRequest } from "@/server/middleware";
import { restrictTo } from "@/server/controllers/auth-controller";
import { Role } from "@prisma/client";
import { WorkbookJSON } from "@/utils/workbook-data-mapper";

interface RequestContext {
  params: Promise<{
    article_id: string;
  }>;
}

const router = createEdgeRouter<NextRequest, RequestContext>();

router.use(logRequest);
router.use(restrictTo(Role.ADMIN, Role.SYSTEM, Role.TEACHER));

router.get(async (req, ctx) => {
  try {
    const { article_id } = await ctx.params;

    // 1. Fetch Article with Relations
    let article: any = await prisma.article.findUnique({
      where: { id: article_id },
      include: {
        multipleChoiceQuestions: true,
        shortAnswerQuestions: true,
        longAnswerQuestions: true,
      },
    });

    let isChapter = false;

    // 2. If not article, Try Fetch Chapter
    if (!article) {
      article = await prisma.chapter.findUnique({
        where: { id: article_id },
        include: {
          multipleChoiceQuestions: true,
          shortAnswerQuestions: true,
          longAnswerQuestions: true,
        },
      });
      isChapter = !!article;
    }

    if (!article) {
      return NextResponse.json(
        { message: "Article or Chapter not found" },
        { status: 404 }
      );
    }

    // 2. Extract Vocabulary from Article Words (limit to 5)
    let vocab: WorkbookJSON["vocabulary"] = [];
    if (Array.isArray(article.words)) {
      vocab = (article.words as any[]).slice(0, 5).map((w: any) => ({
        word: w.vocabulary,
        phonetic: "",
        definition: w.definition?.en || w.definition || "",
      }));
    }

    // 3. Check if translatedPassage exists
    let translatedPassage = article.translatedPassage;

    // 4. Parse translatedPassage to align EN and TH arrays
    let enSentences: string[] = [];
    let thSentences: string[] = [];

    if (
      translatedPassage &&
      typeof translatedPassage === "object" &&
      !Array.isArray(translatedPassage)
    ) {
      const translations = translatedPassage as Record<string, string[]>;

      if (translations.en && Array.isArray(translations.en)) {
        enSentences = translations.en;
      }

      const targetLang = ["th", "cn", "zh-CN", "vi", "zh-TW", "tw"].find(
        (lang) => translations[lang] && translations[lang].length > 0
      );

      if (targetLang && translations[targetLang]) {
        thSentences = translations[targetLang];
      }
    }

    // 5. Create article_paragraphs by grouping sentences
    // Group every 3-5 sentences into a paragraph
    const paragraphs: { number: number; text: string }[] = [];
    const sentencesPerParagraph = Math.ceil(enSentences.length / 3); // Aim for ~3 paragraphs

    for (let i = 0; i < enSentences.length; i += sentencesPerParagraph) {
      const paragraphSentences = enSentences.slice(
        i,
        i + sentencesPerParagraph
      );
      paragraphs.push({
        number: paragraphs.length + 1,
        text: paragraphSentences.join(" "),
      });
    }

    // If no translated sentences, fallback to splitting passage by \n\n
    if (paragraphs.length === 0 && article.passage) {
      const fallbackParagraphs = (article.passage as string).split("\n\n");
      fallbackParagraphs.forEach((p: string, i: number) => {
        paragraphs.push({
          number: i + 1,
          text: p,
        });
      });
    }

    // 6. Create translation_paragraphs aligned with article_paragraphs
    const translationParagraphs: { label: string; text: string }[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const startIdx = i * sentencesPerParagraph;
      const endIdx = Math.min(
        startIdx + sentencesPerParagraph,
        thSentences.length
      );
      const translatedSentences = thSentences.slice(startIdx, endIdx);

      translationParagraphs.push({
        label: `Paragraph ${i + 1}`,
        text: translatedSentences.join(" "),
      });
    }

    // 7. Get 4 comprehension questions (limit to first 4 MCQs)
    const compQuestions = article.multipleChoiceQuestions
      .slice(0, 4)
      .map((q: any, i: number) => ({
        number: i + 1,
        question: q.question,
        options: q.options,
      }));

    // 8. Get MC answers (from first 4 questions)
    const mcAnswers = article.multipleChoiceQuestions
      .slice(0, 4)
      .map((q: any, i: number) => {
        const answerIndex = q.options.findIndex(
          (opt: string) =>
            opt.toLowerCase().includes(q.answer.toLowerCase()) ||
            q.answer.toLowerCase().includes(opt.toLowerCase())
        );
        const letter = String.fromCharCode(97 + Math.max(0, answerIndex)); // a, b, c, d
        return {
          number: i + 1,
          letter: letter,
          text: q.answer,
        };
      });

    // 9. Get 1 short answer question with sentence starters
    let shortAnswerQuestion = "";
    let sentenceStarters: string[] = [
      "I think...",
      "The article says...",
      "In my opinion...",
    ];

    if (article.shortAnswerQuestions.length > 0) {
      // Find a valid question (not just a single letter)
      const validSAQ = article.shortAnswerQuestions.find(
        (q: any) => q.question.length > 5 && q.question.includes(" ")
      );

      if (validSAQ) {
        shortAnswerQuestion = validSAQ.question;

        // Extract first 2 words from answer for sentence starters
        const answerWords = validSAQ.answer.trim().split(/\s+/);
        if (answerWords.length >= 2) {
          const starter = `${answerWords[0]} ${answerWords[1]}...`;
          sentenceStarters = [starter, "I think...", "The article says..."];
        }
      } else {
        // Fallback: use first question even if it's short
        shortAnswerQuestion = article.shortAnswerQuestions[0].question;
      }
    }

    // 10. Create vocab_match (shuffled definitions)
    const vocabMatch = vocab.map((v, i) => ({
      number: i + 1,
      word: v.word,
      letter: String.fromCharCode(97 + i), // a, b, c, d, e
      definition: v.definition,
    }));

    // Shuffle definitions for the matching game
    const shuffledDefinitions = [...vocab.map((v) => v.definition)];
    for (let i = shuffledDefinitions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDefinitions[i], shuffledDefinitions[j]] = [
        shuffledDefinitions[j],
        shuffledDefinitions[i],
      ];
    }

    const vocabMatchShuffled = vocabMatch.map((vm, i) => ({
      ...vm,
      definition: shuffledDefinitions[i],
    }));

    // Create answer string for vocab_match
    const vocabMatchAnswerString = vocabMatch
      .map((vm) => {
        const correctLetter = String.fromCharCode(
          97 + shuffledDefinitions.indexOf(vm.definition)
        );
        return `${vm.number}-${correctLetter}`;
      })
      .join(", ");

    // 11. Create vocab_fill (fill in the blank sentences)
    // Create contextual sentences using the vocabulary words
    const vocabFill = vocab.slice(0, 4).map((v, i) => {
      // Find sentences in the article that contain this word
      const allSentences = enSentences
        .join(" ")
        .split(/[.!?]+/)
        .filter((s) => s.trim());
      const sentenceWithWord = allSentences.find((s) =>
        s.toLowerCase().includes(v.word.toLowerCase())
      );

      let sentence = "";
      if (sentenceWithWord) {
        // Replace the word with a blank
        sentence =
          sentenceWithWord
            .trim()
            .replace(
              new RegExp(`\\b${v.word}\\b`, "i"),
              '<span class="blank"></span>'
            ) + ".";
      } else {
        // Fallback: create a generic sentence
        sentence = `A ${v.word} is <span class="blank"></span>.`;
      }

      return {
        number: i + 1,
        sentence: sentence,
      };
    });

    const vocabFillAnswerString = vocab
      .slice(0, 4)
      .map((v, i) => `${i + 1}. ${v.word}`)
      .join(", ");

    // 12. Create sentence_order_questions (from first 2 paragraphs)
    const sentenceOrderQuestions = paragraphs.slice(0, 2).map((p) => {
      const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
      const firstSentence = sentences[0] || p.text;
      const words = firstSentence.trim().split(/\s+/);

      // Take complete sentence (up to 10 words for simplicity)
      const sentenceWords = words.slice(0, Math.min(10, words.length));

      // Shuffle the words
      const shuffled = [...sentenceWords];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return { words: shuffled };
    });

    const sentenceOrderAnswers = paragraphs.slice(0, 2).map((p, i) => {
      const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
      const firstSentence = sentences[0] || p.text;
      const words = firstSentence.trim().split(/\s+/);
      const sentenceWords = words.slice(0, Math.min(10, words.length));

      return {
        number: i + 1,
        sentence: sentenceWords.join(" ") + ".",
      };
    });

    // 13. Create sentence_completion_prompts (use different sentences from each paragraph)
    const sentenceCompletionPrompts = paragraphs.slice(0, 3).map((p, i) => {
      const sentences = p.text.split(/[.!?]+/).filter((s) => s.trim());
      // Use different sentence for each paragraph (i-th sentence if available)
      const targetSentence =
        sentences[Math.min(i, sentences.length - 1)] || sentences[0] || "";
      const words = targetSentence.trim().split(/\s+/);

      // Cut at roughly half the sentence length (minimum 3 words, maximum 8 words)
      const cutPoint = Math.max(3, Math.min(8, Math.floor(words.length / 2)));
      const prompt = words.slice(0, cutPoint).join(" ");

      return {
        number: i + 1,
        prompt: prompt,
      };
    });

    // 14. Get writing prompt (validate it's a real question)
    let writingPrompt = "Write about what you learned from this article.";

    if (article.longAnswerQuestions.length > 0) {
      // Find a valid question (not just a single letter)
      const validLAQ = article.longAnswerQuestions.find(
        (q: any) => q.question.length > 5 && q.question.includes(" ")
      );

      if (validLAQ) {
        writingPrompt = validLAQ.question;
      } else {
        // Fallback: use first question even if it's short
        const firstQuestion = article.longAnswerQuestions[0].question;
        if (firstQuestion.length > 1) {
          writingPrompt = firstQuestion;
        }
      }
    }

    // 15. Build Workbook JSON
    const workbookData: WorkbookJSON = {
      lesson_number: isChapter
        ? `Chapter ${article.chapterNumber}`
        : "Lesson 1",
      lesson_title: article.title || "",
      level_name: `Level ${article.raLevel || 0}`,
      cefr_level: `CEFR ${article.cefrLevel || ""}`,
      article_type: article.type || "",
      genre: article.genre || "",
      vocabulary: vocab,
      article_image_url: `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${article.id}.png`,
      article_caption: article.summary || "Article Illustration",
      article_url: isChapter
        ? `https://app.reading-advantage.com/th/student/stories/${article.storyId}/${article.chapterNumber}`
        : `https://app.reading-advantage.com/th/student/read/${article.id}`,
      article_paragraphs: paragraphs,
      comprehension_questions: compQuestions,
      short_answer_question: shortAnswerQuestion,
      sentence_starters: sentenceStarters,
      vocab_match: vocabMatchShuffled,
      vocab_fill: vocabFill,
      vocab_word_bank: vocab.map((v) => v.word),
      sentence_order_questions: sentenceOrderQuestions,
      sentence_completion_prompts: sentenceCompletionPrompts,
      writing_prompt: writingPrompt,
      mc_answers: mcAnswers,
      vocab_match_answer_string: vocabMatchAnswerString,
      vocab_fill_answer_string: vocabFillAnswerString,
      sentence_order_answers: sentenceOrderAnswers,
      translation_paragraphs: translationParagraphs,
    };

    return NextResponse.json(workbookData);
  } catch (error) {
    console.error("Error exporting workbook:", error);
    return NextResponse.json(
      { message: "Internal server error", error },
      { status: 500 }
    );
  }
}) as any;

export async function GET(request: NextRequest, ctx: RequestContext) {
  const result = await router.run(request, ctx);
  if (result instanceof NextResponse) {
    return result;
  }
  throw new Error("Expected a NextResponse from router.run");
}
