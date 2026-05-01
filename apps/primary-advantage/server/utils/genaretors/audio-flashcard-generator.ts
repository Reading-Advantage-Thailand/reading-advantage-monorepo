import { prisma } from "@/lib/prisma";
import {
  AUDIO_WORDS_URL,
  AVAILABLE_VOICES,
  BASE_TEXT_TO_SPEECH_URL,
} from "../constants";
import base64 from "base64-js";
import fs from "fs";
import path from "path";
import { generateWordList } from "./wordlist-generator";
import { uploadToBucket } from "@/utils/storage";

export type SentencesResponse = {
  sentence: string;
  translation: {
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
};

export type WordsResponse = {
  vocabulary: string;
  definition: {
    en: string;
    th: string;
    cn: string;
    tw: string;
    vi: string;
  };
  timeSeconds?: number;
};

export type GenerateAudioParams = {
  sentences: SentencesResponse[];
  words: WordsResponse[];
  articleId: string;
};

// export type GenerateChapterAudioParams = {
//   sentences: SentencesResponse[];
//   words: WordsResponse[];
//   storyId: string;
//   chapterNumber: string;
// };

interface TimePoint {
  timeSeconds: number;
  markName: string;
}

function contentToSSML(content: string[]): string {
  let ssml = "<speak>";
  content.forEach((sentence, i) => {
    ssml += `<s><mark name='sentence${
      i + 1
    }'/>${sentence}<break time="500ms"/></s>`;
  });
  ssml += "</speak>";
  return ssml;
}

export async function generateAudioForFlashcard({
  sentences,
  words,
  articleId,
}: GenerateAudioParams): Promise<void> {
  try {
    const voice =
      AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];

    // Extract sentence strings for audio generation
    const sentenceTexts: string[] = Array.isArray(sentences)
      ? sentences.map((item: any) => item?.sentence)
      : [];

    // Extract word strings for audio generation
    const wordTexts: string[] = Array.isArray(words)
      ? words.map((item: any) => item?.vocabulary)
      : [];

    let sentenceTimePoints: SentencesResponse[] = [];
    let wordTimePoints: WordsResponse[] = [];

    // Generate audio for sentences
    if (sentenceTexts.length > 0) {
      const sentenceResponse = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { ssml: contentToSSML(sentenceTexts) },
            voice: {
              languageCode: "en-US",
              name: voice,
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
            enableTimePointing: ["SSML_MARK"],
          }),
        },
      );

      if (!sentenceResponse.ok) {
        throw new Error(`Sentence audio error: ${sentenceResponse.statusText}`);
      }

      const sentenceData = await sentenceResponse.json();
      const sentenceAudio = sentenceData.audioContent;
      const sentenceTimepoints: TimePoint[] = sentenceData?.timepoints;

      // Combine sentences with timepoints
      sentenceTimePoints = sentences.map((sentence, index) => ({
        sentence: sentence.sentence,
        translation: sentence.translation,
        timeSeconds: sentenceTimepoints[index]?.timeSeconds,
      }));

      const sentenceMP3 = base64.toByteArray(sentenceAudio);

      // Ensure the sentences directory exists
      const sentencesDir = path.join(process.cwd(), "data/audios/sentences");
      if (!fs.existsSync(sentencesDir)) {
        fs.mkdirSync(sentencesDir, { recursive: true });
      }

      const sentenceLocalPath = path.join(sentencesDir, `${articleId}.mp3`);
      fs.writeFileSync(sentenceLocalPath, sentenceMP3);

      await uploadToBucket(
        sentenceLocalPath,
        `audios/sentences/${articleId}.mp3`,
      );

      fs.unlinkSync(sentenceLocalPath);
    }

    // Generate audio for words
    if (wordTexts.length > 0) {
      const wordResponse = await fetch(
        `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: { ssml: contentToSSML(wordTexts) },
            voice: {
              languageCode: "en-US",
              name: voice,
            },
            audioConfig: {
              audioEncoding: "MP3",
            },
            enableTimePointing: ["SSML_MARK"],
          }),
        },
      );

      if (!wordResponse.ok) {
        throw new Error(`Word audio error: ${wordResponse.statusText}`);
      }

      const wordData = await wordResponse.json();
      const wordAudio = wordData.audioContent;
      const wordTimepoints: TimePoint[] = wordData?.timepoints;

      // Combine words with timepoints
      wordTimePoints = words.map((word, index) => ({
        vocabulary: word.vocabulary,
        definition: word.definition,
        timeSeconds: wordTimepoints[index]?.timeSeconds,
      }));

      const wordMP3 = base64.toByteArray(wordAudio);

      // Ensure the words directory exists
      const wordsDir = path.join(process.cwd(), "data/audios/words");
      if (!fs.existsSync(wordsDir)) {
        fs.mkdirSync(wordsDir, { recursive: true });
      }

      const wordLocalPath = path.join(wordsDir, `${articleId}.mp3`);
      fs.writeFileSync(wordLocalPath, wordMP3);

      await uploadToBucket(wordLocalPath, `audios/words/${articleId}.mp3`);

      fs.unlinkSync(wordLocalPath);
    }

    // Store both sentence and word data with their respective audio URLs
    await prisma.sentencsAndWordsForFlashcard.create({
      data: {
        sentence:
          sentenceTimePoints.length > 0
            ? JSON.parse(JSON.stringify(sentenceTimePoints))
            : null,
        audioSentencesUrl:
          sentenceTimePoints.length > 0
            ? `/audios/sentences/${articleId}.mp3`
            : null,
        words:
          wordTimePoints.length > 0
            ? JSON.parse(JSON.stringify(wordTimePoints))
            : null,
        wordsUrl:
          wordTimePoints.length > 0 ? `/audios/words/${articleId}.mp3` : null,
        articleId: articleId,
      },
    });

    return;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message || error;
    throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(errorDetails)}`;
  }
}

//   export async function generateChapterAudioForWord({
//     wordList,
//     storyId,
//     chapterNumber,
//   }: GenerateChapterAudioParams): Promise<void> {
//     {
//       try {
//         const voice =
//           AVAILABLE_VOICES[Math.floor(Math.random() * AVAILABLE_VOICES.length)];

//         const vocabulary: string[] = Array.isArray(wordList)
//           ? wordList.map((item: any) => item?.vocabulary)
//           : [];

//         let allTimePoints: TimePoint[] = [];

//         const response = await fetch(
//           `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`,
//           {
//             method: "POST",
//             headers: {
//               "Content-Type": "application/json",
//             },
//             body: JSON.stringify({
//               input: { ssml: contentToSSML(vocabulary) },
//               voice: {
//                 languageCode: "en-US",
//                 name: voice,
//               },
//               audioConfig: {
//                 audioEncoding: "MP3",
//               },
//               enableTimePointing: ["SSML_MARK"],
//             }),
//           }
//         );

//         if (!response.ok) {
//           throw new Error(`Error: ${response.statusText}`);
//         }

//         const data = await response.json();
//         const audio = data.audioContent;
//         allTimePoints = data?.timepoints;
//         const MP3 = base64.toByteArray(audio);

//         const localPath = `${process.cwd()}/data/audios-words/${storyId}-${chapterNumber}.mp3`;
//         fs.writeFileSync(localPath, MP3);

//         await uploadToBucket(
//           localPath,
//           `${AUDIO_WORDS_URL}/${storyId}-${chapterNumber}.mp3`
//         );

//         await db
//           .collection("stories-word-list")
//           .doc(`${storyId}-${chapterNumber}`)
//           .update({
//             timepoints: allTimePoints,
//             id: storyId,
//             chapterNumber: chapterNumber,
//           });
//       } catch (error: any) {
//         throw `failed to generate audio: ${error} \n\n error: ${JSON.stringify(
//           error.response.data
//         )}`;
//       }
//     }
//   }

//   export async function saveWordList({
//     wordList,
//     storyId,
//     chapterNumber,
//   }: GenerateChapterAudioParams): Promise<void> {
//     {
//       try {
//         const wordListRef = db
//           .collection("stories-word-list")
//           .doc(`${storyId}-${chapterNumber}`);
//         await wordListRef.set({
//           word_list: wordList,
//         });
//       } catch (error: any) {
//         throw `failed to save word list: ${error} \n\n error: ${JSON.stringify(
//           error.response.data
//         )}`;
//       }
//     }
//   }
