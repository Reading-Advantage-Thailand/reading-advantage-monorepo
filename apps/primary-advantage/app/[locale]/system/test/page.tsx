import { Button } from "@/components/ui/button";
import AudioTest from "./audio-test";
import AudioTestWord from "./audio-test-word";
import { testConnection } from "@/lib/test";
import ArticleTestGenerate from "./article-test-genarate";
import UploadTest from "./upload-test";
import { deleteAllArticles, generateImages } from "@/actions/test";
// import FlashcardGame from "@/components/flashcards/flashcard-game";
// import { FlashcardType } from "@/types/enum";
import GenerateImages from "./generate-images";

export default async function TestFunctionality() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <AudioTest />
      <AudioTestWord />
      <div className="flex flex-col gap-4">
        <Button
          onClick={async () => {
            "use server";
            const result = await testConnection();
            console.log(result);
          }}
        >
          Test Storage
        </Button>
      </div>
      <ArticleTestGenerate />
      <Button
        onClick={async () => {
          "use server";
          await deleteAllArticles();
        }}
      >
        Delete All Articles
      </Button>
      <UploadTest />
      <GenerateImages />
    </div>
  );
}
