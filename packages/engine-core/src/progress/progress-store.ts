import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ProgressData, SessionProgress, SessionStatus, StudySessionSpec } from "../domain/types.js";

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

  updateSessionStatus(sessionId: string, status: SessionStatus, scores?: { exerciseScore?: number; quizScore?: number }): void {
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
}
