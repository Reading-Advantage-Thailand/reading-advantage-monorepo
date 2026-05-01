import fs from "fs";
import path from "path";

export function createLogFile(
  articleId: string,
  data: any,
  logType: "processing" | "input" | "output" | "error" | "problems",
): void {
  try {
    const timestamp = new Date().toISOString();
    const logDir = path.join(process.cwd(), "logs", "audio-processing");

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFileName = `${articleId}-${logType}-${Date.now()}.json`;
    const logFilePath = path.join(logDir, logFileName);

    const logEntry = {
      timestamp,
      articleId,
      logType,
      data,
    };

    fs.writeFileSync(logFilePath, JSON.stringify(logEntry, null, 2));

    // Also create a summary log file
    const summaryLogPath = path.join(logDir, `${articleId}-summary.log`);
    const summaryEntry = `[${timestamp}] ${logType.toUpperCase()}: ${logType === "input" ? "Input data logged" : logType === "output" ? "Output data logged" : logType === "processing" ? "Processing step logged" : "Error logged"}\n`;

    fs.appendFileSync(summaryLogPath, summaryEntry);
  } catch (error) {
    console.error("Failed to create log file:", error);
  }
}
