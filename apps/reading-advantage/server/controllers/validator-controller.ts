import { NextRequest, NextResponse } from "next/server";
import { sendDiscordWebhook } from "../utils/send-discord-webhook";
import db from "@/configs/firestore-config";
import { generateMCQuestion } from "../utils/generators/mc-question-generator";
import { generateSAQuestion } from "../utils/generators/sa-question-generator";
import { generateLAQuestion } from "../utils/generators/la-question-generator";
import {
  generateWordList,
  GenerateWordListResponse,
} from "../utils/generators/word-list-generator";
import { AUDIO_URL, AUDIO_WORDS_URL, IMAGE_URL } from "../constants";
import uploadToBucket from "@/utils/uploadToBucket";
import storage from "@/utils/storage";
import fs from "fs";
import { generateAudio } from "../utils/generators/audio-generator";
import { Article } from "../models/article";
import {
  generateAudioForWord,
  GenerateAudioParams,
  WordListResponse,
} from "../utils/generators/audio-words-generator";
import { experimental_generateImage as generateImage } from "ai";
import { openai, openaiImages } from "@/utils/openai";
import { google, googleImages } from "@/utils/google";

interface ArticleType {
  cefr_level?: string;
  type?: string;
  genre?: string;
  subgenre?: string;
  passage?: string;
  title?: string;
  summary?: string;
  image_description?: string;
  id?: string;
  rating?: number;
}

interface ValidationResponse {
  id: string;
  task: string;
  status: string;
  errorMessage?: string;
}

export async function validateArticle(
  req: NextRequest,
  params: unknown,
  next: () => void
) {
  let { filterByDate, runToday } = await req.json();

  // Check if filterByDate is empty and runToday is true
  if (!filterByDate && runToday) {
    const today = new Date();
    filterByDate = today.toISOString().split("T")[0];
  }

  // Check if filterByDate is a valid date
  if (!filterByDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json(
      { error: "Invalid date format (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  // init
  const timeTaken = Date.now();
  const userAgent = req.headers.get("user-agent") || "";
  const reqUrl = req.url;

  const startDate = new Date(filterByDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1);
  const isoStartDate = startDate.toISOString();
  const isoEndDate = endDate.toISOString();

  // Query database for articles within date range
  const query = db
    .collection("new-articles")
    .where("created_at", ">=", isoStartDate)
    .where("created_at", "<", isoEndDate);
  const snapshot = await query.get();

  // Send webhook
  await sendDiscordWebhook({
    title: "Article Validation",
    embeds: [
      {
        description: {
          date: filterByDate,
          "total article": `${snapshot.docs.length} articles`,
        },
        color: 0x0099ff,
      },
    ],
    reqUrl,
    color: 0x0099ff,
    userAgent,
  });

  // Validate articles
  const validators = snapshot.docs.map((doc) => validator(doc.id));
  const results = await Promise.all(validators);

  // count successful results
  const passedResults = results.filter((result) =>
    result.validation.every((validation) => validation.status === "pass")
  );
  const regeneratedResults = results.filter((result) =>
    result.validation.some((validation) => validation.status === "regenerated")
  );
  const failedResults = results.filter((result) =>
    result.validation.some((validation) => validation.status === "failed")
  );

  // calculate rating stat from passed results display by each cefr level
  const ratingStats = passedResults.reduce((acc, result) => {
    if (result.rating && result.cefr_level) {
      acc[result.cefr_level] = acc[result.cefr_level] || { total: 0, sum: 0 };
      acc[result.cefr_level].total++;
      acc[result.cefr_level].sum += result.rating;
    }
    return acc;
  }, {} as any);

  let embeds = {
    date: filterByDate,
    total: snapshot.docs.length,
    "time taken":
      ((Date.now() - timeTaken) / 1000 / 60).toFixed(2) + " minutes",
    passed: passedResults.length,
    regenerated: regeneratedResults.length,
    failed: failedResults.length + "\n",
    ":star: rating stats":
      "\n" +
      Object.entries(ratingStats)
        .map(
          ([cefr_level, { total, sum }]: any) =>
            `CEFR: *${cefr_level}* average rating: *${(sum / total).toFixed(
              2
            )}* total: *${total}*`
        )
        .join("\n"),
  } as any;

  if (regeneratedResults.length > 0) {
    embeds = {
      ...embeds,
      "\n:star: regenerated details":
        "\n" +
        regeneratedResults
          .flatMap((result) =>
            result.validation
              .filter((validation) => validation.status === "regenerated")
              .map(
                (validation) =>
                  `**id**: *${validation.id}*, **task**: *${validation.task}*, **status**: *${validation.status}*`
              )
          )
          .join("\n"),
    };
  }

  if (failedResults.length > 0) {
    embeds = {
      ...embeds,
      "\n:star: failed details":
        "\n" +
        failedResults
          .flatMap((result) =>
            result.validation.map(
              (validation) =>
                `**id**: *${validation.id}*, **task**: *${validation.task}*, **code**: *${validation.errorMessage}*`
            )
          )
          .join("\n"),
    };
  }

  // Send webhook
  await sendDiscordWebhook({
    title: "Article Validation Results",
    embeds: [
      {
        description: embeds,
        color: 0x0099ff,
      },
    ],
    reqUrl,
    color: 0x0099ff,
    userAgent,
  });

  return NextResponse.json({
    message: "Article validation complete",
    total: snapshot.docs.length,
    passed: passedResults.length,
    regenerated: regeneratedResults.length,
    failed: failedResults.length,
    timeTaken: (Date.now() - timeTaken) / 1000 / 60,
  });
}

async function validator(articleId: string): Promise<{
  id: string;
  validation: ValidationResponse[];
  rating?: number;
  cefr_level?: string;
}> {
  const articleDoc = await db.collection("new-articles").doc(articleId).get();
  const wordListDoc = await db.collection("word-list").doc(articleId).get();

  if (!articleDoc.exists) {
    throw new Error(`article ${articleId} not found in Firestore`);
  }

  let wordListData = {} as GenerateWordListResponse;

  if (!wordListDoc.exists) {
    wordListData = await generateWordList({
      passage: articleDoc.data()?.passage,
    });
    const wordListRef = db.collection("word-list").doc(articleId);
    await wordListRef.set({
      word_list: wordListData.word_list,
      articleId: articleId,
      id: articleId,
      created_at: new Date().toISOString(),
    });
  }

  const articleData = articleDoc.data() as Article;

  if (!articleData.id) {
    // Set article id
    await db
      .collection("new-articles")
      .doc(articleId)
      .set({ id: articleId }, { merge: true });
  }

  try {
    const resp = await Promise.all([
      validateQuestions(
        articleId,
        "mc-questions",
        generateMCQuestion,
        articleData
      ),
      validateQuestions(
        articleId,
        "sa-questions",
        generateSAQuestion,
        articleData
      ),
      validateQuestions(
        articleId,
        "la-questions",
        generateLAQuestion,
        articleData
      ),
      validateImage(articleData.image_description!, articleId),
      validateAudio(articleData.passage!, articleId),
      validateAudioWords({ wordList: wordListData.word_list, articleId }),
    ]);

    return {
      id: articleId,
      validation: resp,
      rating: articleData.average_rating || undefined,
      cefr_level: articleData.cefr_level || undefined,
    };
  } catch (error: any) {
    return {
      id: articleId,
      validation: [
        {
          id: articleId,
          task: error.task,
          status: "failed",
          errorMessage: error.message,
        },
      ],
    };
  }
}

async function validateQuestions(
  articleId: string,
  collectionName: string,
  generateFunction: any,
  articleData: ArticleType
): Promise<ValidationResponse> {
  try {
    const questionsSnapshot = await db
      .collection("new-articles")
      .doc(articleId)
      .collection(collectionName)
      .get();
    if (questionsSnapshot.empty) {
      const articleResp = await generateFunction(
        articleData.cefr_level,
        articleData.type,
        articleData.genre,
        articleData.subgenre,
        articleData.passage,
        articleData.title,
        articleData.summary,
        articleData.image_description
      );

      if (collectionName === "la-questions") {
        await db
          .collection("new-articles")
          .doc(articleId)
          .collection(collectionName)
          .add(articleResp);
      } else {
        for (let i = 0; i < articleResp.questions.length; i++) {
          await db
            .collection("new-articles")
            .doc(articleId)
            .collection(collectionName)
            .add(articleResp.questions[i]);
        }
      }
      return { id: articleId, task: collectionName, status: "regenerated" };
    }
    return { id: articleId, task: collectionName, status: "pass" };
  } catch (error: any) {
    error.id = articleId;
    error.message = error.code;
    error.task = collectionName;
    throw error;
  }
}

async function validateImage(
  imageDesc: string,
  articleId: string
): Promise<{ id: string; task: string; status: string }> {
  try {
    const generate = async () => {
      const { image } = await generateImage({
        model: openai.image(openaiImages),
        n: 1,
        prompt: imageDesc,
        size: "1024x1024",
      });

      // const { image } = await generateImage({
      //   model: google.image(googleImages),
      //   prompt: imageDesc,
      //   providerOptions: {
      //     vertex: { aspectRatio: "1:1", sampleCount: 1 },
      //   },
      // });

      const base64 = image.base64;

      const base64Image: Buffer = Buffer.from(base64, "base64");

      const localPath = `${process.cwd()}/data/images/${articleId}.png`;
      fs.writeFileSync(localPath, base64Image as Uint8Array);

      await uploadToBucket(localPath, `${IMAGE_URL}/${articleId}.png`);
    };

    const fileExtension = ".png";
    const bucket = storage.bucket("artifacts.reading-advantage.appspot.com");

    const fileExists = await bucket
      .file(`${IMAGE_URL}/${articleId}${fileExtension}`)
      .exists();
    if (!fileExists[0]) {
      await generate();
      return { id: articleId, task: "image", status: "regenerated" };
    } else {
      return { id: articleId, task: "image", status: "pass" };
    }
  } catch (error: any) {
    error.id = articleId;
    error.message = error.code;
    error.task = "image";
    throw error;
  }
}

async function validateAudio(
  passage: string,
  articleId: string
): Promise<{ id: string; task: string; status: string }> {
  try {
    const fileExtension = ".mp3";
    const fileExists1 = await storage
      .bucket("artifacts.reading-advantage.appspot.com")
      .file(`${AUDIO_URL}/${articleId}${fileExtension}`)
      .exists();
    const fileExists2 = await storage
      .bucket("artifacts.reading-advantage.appspot.com")
      .file(`${AUDIO_URL}/${articleId}_0${fileExtension}`)
      .exists();

    if (!fileExists2[0]) {
      if (!fileExists1[0]) {
        await generateAudio({ passage, articleId });
        return { id: articleId, task: "audio", status: "regenerated" };
      } else {
        return { id: articleId, task: "audio", status: "pass" };
      }
    } else {
      return { id: articleId, task: "audio", status: "pass" };
    }
  } catch (error: any) {
    error.id = articleId;
    error.message = error.message;
    error.task = "audio";
    throw error;
  }
}

async function validateAudioWords({
  wordList,
  articleId,
}: GenerateAudioParams): Promise<{ id: string; task: string; status: string }> {
  try {
    const fileExtension = ".mp3";
    const fileExists = await storage
      .bucket("artifacts.reading-advantage.appspot.com")
      .file(`${AUDIO_WORDS_URL}/${articleId}${fileExtension}`)
      .exists();
    if (!fileExists[0]) {
      await generateAudioForWord({ wordList, articleId });
      return { id: articleId, task: "audio", status: "regenerated" };
    } else {
      return { id: articleId, task: "audio", status: "pass" };
    }
  } catch (error: any) {
    error.id = articleId;
    error.message = error.message;
    error.task = "audio";
    throw error;
  }
}
