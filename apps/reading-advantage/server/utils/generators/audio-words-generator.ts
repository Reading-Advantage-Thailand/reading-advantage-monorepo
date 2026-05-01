import {
  AUDIO_WORDS_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
} from "../../constants";
import base64 from "base64-js";
import fs from "fs";
import uploadToBucket from "@/utils/uploadToBucket";
import db from "@/configs/firestore-config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type WordListResponse = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
};

export type GenerateAudioParams = {
  wordList: WordListResponse[];
  articleId: string;
  isChapter?: boolean;
  chapterId?: string;
};

export type GenerateChapterAudioParams = {
  wordList: WordListResponse[];
  storyId: string;
  chapterNumber: string;
};

interface TimePoint {
  timeSeconds: number;
  markName: string;
}

function contentToSSML(content: string[]): string {
  let ssml = "<speak>";
  content.forEach((sentence, i) => {
    ssml += `<s><mark name='word${
      i + 1
    }'/>${sentence}<break time="500ms"/></s>`;
  });
  ssml += "</speak>";
  return ssml;
}

export type WordWithTimePoint = {
  markName: string;
  definition: {
    cn: string;
    en: string;
    th: string;
    tw: string;
    vi: string;
  };
  vocabulary: string;
  timeSeconds: number;
};

export async function generateAudioForWord({
  wordList,
  articleId,
  isChapter = false,
  chapterId,
  userId = "",
}: GenerateAudioParams & {
  isUserGenerated?: boolean;
  userId?: string;
}): Promise<WordWithTimePoint[]> {
  try {
    console.log(`🎵 Starting generateAudioForWord for ${articleId}...`);
    console.log(
      `📝 Word list count: ${Array.isArray(wordList) ? wordList.length : "not an array"}`
    );

    const voice =
      AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];

    const vocabulary: string[] = Array.isArray(wordList)
      ? wordList.map((item: any) => item?.vocabulary).filter(Boolean)
      : [];

    console.log(`📝 Vocabulary count after filtering: ${vocabulary.length}`);

    if (vocabulary.length === 0) {
      console.log(
        `⚠️ No vocabulary found for ${articleId}, returning empty array`
      );
      return [];
    }

    let allTimePoints: TimePoint[] = [];

    const ssmlContent = contentToSSML(vocabulary);
    console.log(`📝 SSML content length: ${ssmlContent.length}`);

    const response = await fetch(
      `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { ssml: ssmlContent },
          voice: {
            languageCode: "en-US",
            name: voice,
          },
          audioConfig: {
            audioEncoding: "MP3",
          },
          enableTimePointing: ["SSML_MARK"],
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `❌ Text-to-speech API error: ${response.status} ${response.statusText}`
      );
      const errorText = await response.text();
      console.error(`❌ Error response: ${errorText}`);
      throw new Error(
        `Text-to-speech API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log(`📝 API response keys: ${Object.keys(data)}`);

    // Check if data exists and has required properties
    if (!data || !data.audioContent) {
      console.error("❌ Text-to-speech API response:", data);
      throw new Error(
        "Invalid response from text-to-speech API - missing audioContent"
      );
    }

    const audio = data.audioContent;
    allTimePoints = data?.timepoints || [];
    const MP3 = base64.toByteArray(audio);

    const localPath = `${process.cwd()}/data/audios-words/${articleId}.mp3`;
    fs.writeFileSync(localPath, MP3);

    await uploadToBucket(localPath, `${AUDIO_WORDS_URL}/${articleId}.mp3`);

    // Combine word list with time points
    const wordsWithTimePoints: WordWithTimePoint[] = wordList.map(
      (word, index) => {
        const timePoint = allTimePoints.find(
          (tp) => tp.markName === `word${index + 1}`
        );
        return {
          markName: `word${index + 1}`,
          definition: word.definition,
          vocabulary: word.vocabulary,
          timeSeconds: timePoint?.timeSeconds || 0,
        };
      }
    );

    // Update using Prisma
    try {
      if (isChapter && chapterId) {
        // For chapters, don't update database here, just return the result
        // The caller will handle the database update
      } else {
        await prisma.article.update({
          where: { id: articleId },
          data: {
            words: wordsWithTimePoints,
            audioWordUrl: `${articleId}.mp3`,
          },
        });
      }
    } catch (error) {
      console.error("Prisma update error:", error);
    }

    return wordsWithTimePoints;
  } catch (error: any) {
    console.error("Error in generateAudioForWord:", error);
    throw `failed to generate audio: ${error}`;
  }
}

export async function generateChapterAudioForWord({
  wordList,
  storyId,
  chapterNumber,
}: GenerateChapterAudioParams): Promise<void> {
  {
    try {
      const voice =
        AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];

      const vocabulary: string[] = Array.isArray(wordList)
        ? wordList.map((item: any) => item?.vocabulary)
        : [];

      let allTimePoints: TimePoint[] = [];

      const response = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { ssml: contentToSSML(vocabulary) },
            voice: {
              languageCode: "en-US",
              name: voice,
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
            enableTimePointing: ["SSML_MARK"],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      const audio = data.audioContent;
      allTimePoints = data?.timepoints;
      const MP3 = base64.toByteArray(audio);

      const localPath = `${process.cwd()}/data/audios-words/${storyId}-${chapterNumber}.mp3`;
      fs.writeFileSync(localPath, MP3);

      await uploadToBucket(
        localPath,
        `${AUDIO_WORDS_URL}/${storyId}-${chapterNumber}.mp3`
      );

      await db
        .collection("stories-word-list")
        .doc(`${storyId}-${chapterNumber}`)
        .update({
          timepoints: allTimePoints,
          id: storyId,
          chapterNumber: chapterNumber,
        });
    } catch (error: any) {
      throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
        error.response.data
      )}`;
    }
  }
}

export async function saveWordList({
  wordList,
  storyId,
  chapterNumber,
}: GenerateChapterAudioParams): Promise<void> {
  {
    try {
      const wordListRef = db
        .collection("stories-word-list")
        .doc(`${storyId}-${chapterNumber}`);
      await wordListRef.set({
        word_list: wordList,
      });
    } catch (error: any) {
      throw `failed to save word list: ${error} \n\n error: ${JSON.stringify(
        error.response.data
      )}`;
    }
  }
}
