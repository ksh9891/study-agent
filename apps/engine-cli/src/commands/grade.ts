import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatSuccess, formatError } from "../helpers/output.js";
import { ProgressStore } from "@study-agent/engine-core";
import type { StudySessionSpec } from "@study-agent/engine-core";

export async function gradeCommand(repoPath: string, sessionId: string, submissionPath: string): Promise<string> {
  const internalSpecPath = join(repoPath, ".study-agent-internal", "exercises", sessionId, "exercise-spec.internal.json");
  if (!existsSync(internalSpecPath)) {
    return formatError("grade", repoPath, "EXERCISE_NOT_FOUND", `No internal exercise spec for session ${sessionId}`);
  }

  const spec = JSON.parse(readFileSync(internalSpecPath, "utf-8"));
  const expectedArtifacts: string[] = spec.expectedArtifacts ?? [];
  const missingFiles = expectedArtifacts.filter((f: string) => !existsSync(join(submissionPath, f)));

  const passed = missingFiles.length === 0;
  const score = passed ? 100 : Math.round(((expectedArtifacts.length - missingFiles.length) / expectedArtifacts.length) * 100);

  const result: Record<string, unknown> = {
    passed,
    score,
    rubric: [
      { criterion: "All expected files present", passed: missingFiles.length === 0, message: missingFiles.length > 0 ? `Missing: ${missingFiles.join(", ")}` : "All files present" },
    ],
    feedback: passed ? ["All expected artifacts found."] : [`Missing files: ${missingFiles.join(", ")}`],
    nextAction: passed ? "advance" : "retry",
  };

  const publicDir = join(repoPath, ".study-agent");
  const progressStore = new ProgressStore(publicDir);

  // Update exercise sub-result
  const currentProgress = progressStore.load();
  const currentSession = currentProgress?.sessions[sessionId];
  progressStore.updateSessionStatus(sessionId, "in_progress", {
    exercisePassed: passed,
    exerciseScore: score,
    quizPassed: currentSession?.quizPassed,
    quizScore: currentSession?.quizScore,
  });

  // Check if overall session is now passed
  if (passed) {
    const sessionsPath = join(publicDir, "sessions.json");
    if (existsSync(sessionsPath)) {
      const sessionsData = JSON.parse(readFileSync(sessionsPath, "utf-8"));
      const sessions: StudySessionSpec[] = sessionsData.sessions;
      const session = sessions.find((s) => s.id === sessionId);

      if (session?.unlockRule) {
        const updatedProgress = progressStore.load();
        const sessionProgress = updatedProgress?.sessions[sessionId];
        if (sessionProgress && progressStore.isSessionPassed(sessionProgress, session.unlockRule)) {
          progressStore.updateSessionStatus(sessionId, "passed", {
            exercisePassed: sessionProgress.exercisePassed,
            exerciseScore: sessionProgress.exerciseScore,
            quizPassed: sessionProgress.quizPassed,
            quizScore: sessionProgress.quizScore,
          });
          const unlocked = progressStore.checkAndUnlock(sessions);
          result.unlockedSessions = unlocked;
        }
      }
    }
  }

  return formatSuccess("grade", repoPath, result);
}
