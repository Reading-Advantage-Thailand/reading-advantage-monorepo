import fs from "fs";

// Read JSON file
// Read the content of a file and return it as a string
export function readJsonFile<T>(filePath: string): T {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as T;
}
