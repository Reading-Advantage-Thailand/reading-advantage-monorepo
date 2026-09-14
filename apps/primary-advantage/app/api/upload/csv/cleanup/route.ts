import { NextRequest, NextResponse } from "next/server";
import { unlink, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { currentUser } from "@/lib/session";
import { canRunContentTooling, cleanupFileNameSchema } from "@/lib/authorization";

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canRunContentTooling(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    const parsed = cleanupFileNameSchema.safeParse(fileName);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "File name must be a plain basename" },
        { status: 400 },
      );
    }

    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, parsed.data);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete the file
    await unlink(filePath);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("File cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 },
    );
  }
}

// Clean up old temporary files (older than 24 hours)
export async function POST() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canRunContentTooling(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tempDir = path.join(process.cwd(), "temp");

    if (!existsSync(tempDir)) {
      return NextResponse.json({
        success: true,
        message: "No temp directory found",
      });
    }

    const files = await readdir(tempDir);
    const now = Date.now();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      if (file.includes("_")) {
        const timestampStr = file.split("_")[0];
        const timestamp = parseInt(timestampStr);

        if (!isNaN(timestamp) && now - timestamp > oneDayInMs) {
          const filePath = path.join(tempDir, file);
          try {
            await unlink(filePath);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete ${file}:`, error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} old files`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup files" },
      { status: 500 },
    );
  }
}
