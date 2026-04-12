import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ProgressData, SessionProgress, SessionStatus, StudySessionSpec, UnlockRule } from "../domain/types.js";

export class ProgressStore {
  private filePath: string;

  constructor(publicDir: string) {
    this.filePath = join(publicDir, "progress.json");
  }

  load(): ProgressData | null {
    if (!existsSync(this.filePath)) return null;
    return JSON.parse(readFileSync(this.filePath, "utf-8"));
  }

  save(data: ProgressData): void {
    writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  initialize(repo: string, packId: string, sessions: StudySessionSpec[]): ProgressData {
    const sessionData: Record<string, SessionProgress> = {};

    for (let i = 0; i < sessions.length; i++) {
      sessionData[sessions[i].id] = {
        status: i === 0 ? "available" : "locked",
      };
    }

    const data: ProgressData = {
      schemaVersion: "0.1",
      repo,
      packId,
      sessions: sessionData,
    };

    this.save(data);
    return data;
  }

  updateSessionStatus(
    sessionId: string,
    status: SessionStatus,
    scores?: {
      exercisePassed?: boolean;
      exerciseScore?: number;
      quizPassed?: boolean;
      quizScore?: number;
    },
  ): void {
    const data = this.load();
    if (!data) return;

    data.sessions[sessionId] = {
      ...data.sessions[sessionId],
      status,
      ...scores,
      lastAttempt: new Date().toISOString(),
    };

    this.save(data);
  }

  isSessionPassed(progress: SessionProgress, unlockRule: UnlockRule): boolean {
    if (unlockRule.requireExercise && !progress.exercisePassed) return false;
    if (unlockRule.requireQuiz && !progress.quizPassed) return false;
    if (unlockRule.minQuizScore != null && (progress.quizScore ?? 0) < unlockRule.minQuizScore) return false;
    return true;
  }

  checkAndUnlock(sessions: StudySessionSpec[]): string[] {
    const data = this.load();
    if (!data) return [];

    const unlocked: string[] = [];

    for (const session of sessions) {
      if (data.sessions[session.id]?.status !== "locked") continue;
      if (!session.unlockRule) continue;

      const prerequisites = session.unlockRule.prerequisites;
      if (prerequisites.length === 0) continue;

      const allPrereqsMet = prerequisites.every((prereqId) => {
        const prereqProgress = data.sessions[prereqId];
        if (!prereqProgress || prereqProgress.status !== "passed") return false;

        const prereqSession = sessions.find((s) => s.id === prereqId);
        if (!prereqSession?.unlockRule) return prereqProgress.status === "passed";

        return this.isSessionPassed(prereqProgress, prereqSession.unlockRule);
      });

      if (allPrereqsMet) {
        data.sessions[session.id].status = "available";
        unlocked.push(session.id);
      }
    }

    if (unlocked.length > 0) {
      this.save(data);
    }

    return unlocked;
  }
}
