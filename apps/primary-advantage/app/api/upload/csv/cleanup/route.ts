import { NextRequest, NextResponse } from "next/server";
import { unlink, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json(
        { error: "File name is required" },
        { status: 400 },
      );
    }

    const tempDir = path.join(process.cwd(), "temp");
    const filePath = path.join(tempDir, fileName);

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
