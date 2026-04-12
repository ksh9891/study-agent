import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatSuccess, formatError } from "../helpers/output.js";

export async function scaffoldCommand(repoPath: string, sessionId: string): Promise<string> {
  const exerciseSpecPath = join(repoPath, ".study-agent", "exercises", sessionId, "exercise-spec.json");
  if (!existsSync(exerciseSpecPath)) {
    return formatError("scaffold", repoPath, "EXERCISE_NOT_FOUND", `No exercise spec for session ${sessionId}`);
  }

  const spec = JSON.parse(readFileSync(exerciseSpecPath, "utf-8"));
  const starterDir = join(repoPath, ".study-agent", "exercises", sessionId, "starter");

  return formatSuccess("scaffold", repoPath, {
    sessionId,
    exerciseSpec: spec,
    starterDir,
  });
}
