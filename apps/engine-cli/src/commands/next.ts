import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatSuccess, formatError } from "../helpers/output.js";
import { ProgressStore } from "@study-agent/engine-core";
import type { StudySessionSpec } from "@study-agent/engine-core";

export async function nextCommand(repoPath: string): Promise<string> {
  const publicDir = join(repoPath, ".study-agent");
  const sessionsPath = join(publicDir, "sessions.json");
  const progressStore = new ProgressStore(publicDir);

  if (!existsSync(sessionsPath)) {
    return formatError("next", repoPath, "NO_PLAN", "No study plan found. Run 'study-agent-engine run' first.");
  }

  const progress = progressStore.load();
  if (!progress) {
    return formatError("next", repoPath, "NO_PROGRESS", "No progress data found.");
  }

  const sessionsData = JSON.parse(readFileSync(sessionsPath, "utf-8"));
  const sessions: StudySessionSpec[] = sessionsData.sessions;

  // Priority 1: in_progress sessions (resume what you started)
  for (const session of sessions) {
    if (progress.sessions[session.id]?.status === "in_progress") {
      return formatSuccess("next", repoPath, {
        nextSession: session,
        reason: "in_progress",
      });
    }
  }

  // Priority 2: available sessions (start next unlocked session)
  for (const session of sessions) {
    if (progress.sessions[session.id]?.status === "available") {
      return formatSuccess("next", repoPath, {
        nextSession: session,
        reason: "next_available",
      });
    }
  }

  // All completed
  return formatSuccess("next", repoPath, {
    nextSession: null,
    reason: "all_completed",
  });
}
