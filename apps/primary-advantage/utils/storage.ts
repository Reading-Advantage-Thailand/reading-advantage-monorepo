import { Storage } from "@google-cloud/storage";
import fs from "fs";

const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  credentials: {
    client_email: process.env.STORAGE_CLIENT_EMAIL,
    private_key: process.env.STORAGE_PRIVATE_KEY?.replace(/\\n/g, "\n") || "",
  },
  // Production optimizations
  retryOptions: {
    autoRetry: true,
    maxRetries: 3,
    retryDelayMultiplier: 2,
  },

  timeout: 60000, // 60 seconds
});

// export const bucket = storage.bucket(process.env.STORAGE_BUCKET_NAME as string);
export const bucket = storage;

// Utility functions for production
export const uploadToBucket = async (
  filePath: string,
  destination: string,
  isPublic: boolean = true,
  isDeleteLocal: boolean = true,
) => {
  try {
    await bucket
      .bucket(process.env.STORAGE_BUCKET_NAME as string)
      .upload(filePath, {
        destination: destination,
      });

    if (isPublic) {
      await bucket
        .bucket(process.env.STORAGE_BUCKET_NAME as string)
        .file(destination)
        .makePublic();
    }

    // delete the file from the local file system
    // if (isDeleteLocal) {
    //   fs.unlinkSync(filePath);
    // }

    console.log(`✅ Uploaded to bucket: ${destination}`);
  } catch (error) {
    console.error("ERROR UPLOADING TO BUCKET: ", error);
    throw error;
  }
};

export async function deleteFile(fileName: string): Promise<{
  deleted: string[];
  failed: string[];
}> {
  try {
    const filePatterns = [
      `images/${fileName}_1.png`,
      `images/${fileName}_2.png`,
      `images/${fileName}_3.png`,
      `audios/articles/${fileName}.mp3`,
      `audios/words/${fileName}.mp3`,
      `audios/sentences/${fileName}.mp3`,
    ];

    const results = { deleted: [] as string[], failed: [] as string[] };

    const deletePromises = filePatterns.map(async (filePath) => {
      try {
        const file = bucket
          .bucket(process.env.STORAGE_BUCKET_NAME as string)
          .file(filePath);
        const [exists] = await file.exists();

        if (exists) {
          await file.delete();
          results.deleted.push(filePath);
          console.log(`✅ Deleted: ${filePath}`);
        } else {
          console.log(`⚠️  File not found: ${filePath}`);
        }
      } catch (error) {
        results.failed.push(filePath);
        console.error(`❌ Failed to delete ${filePath}:`, error);
      }
    });

    await Promise.all(deletePromises);
    return results;
  } catch (error) {
    console.error("ERROR FINDING FILES:", error);
    return { deleted: [], failed: [] };
  }
}
