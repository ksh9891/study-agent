import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { formatSuccess, formatError } from "../helpers/output.js";

export async function progressCommand(repoPath: string): Promise<string> {
  const progressPath = join(repoPath, ".study-agent", "progress.json");
  if (!existsSync(progressPath)) {
    return formatError("progress", repoPath, "NO_PROGRESS", "No study plan found. Run /study-agent:run first.");
  }

  const progress = JSON.parse(readFileSync(progressPath, "utf-8"));
  return formatSuccess("progress", repoPath, progress, { packId: progress.packId });
}
