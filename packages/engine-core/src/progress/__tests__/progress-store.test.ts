import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProgressStore } from "../progress-store.js";
import type { StudySessionSpec, UnlockRule } from "../../domain/types.js";

function makeSession(id: string, prerequisites: string[] = []): StudySessionSpec {
  return {
    id,
    conceptId: id,
    title: `Session ${id}`,
    learningGoals: [],
    explanationOutline: [],
    evidence: [],
    prerequisites: prerequisites.length > 0 ? prerequisites : undefined,
    unlockRule: {
      prerequisites,
      requireExercise: true,
      requireQuiz: true,
      minQuizScore: 60,
    },
  };
}

describe("ProgressStore", () => {
  let tempDir: string;
  let store: ProgressStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "progress-test-"));
    store = new ProgressStore(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("isSessionPassed", () => {
    const rule: UnlockRule = { prerequisites: [], requireExercise: true, requireQuiz: true, minQuizScore: 60 };

    it("returns false when only exercise passed", () => {
      expect(store.isSessionPassed(
        { status: "in_progress", exercisePassed: true, exerciseScore: 100 },
        rule,
      )).toBe(false);
    });

    it("returns false when only quiz passed", () => {
      expect(store.isSessionPassed(
        { status: "in_progress", quizPassed: true, quizScore: 80 },
        rule,
      )).toBe(false);
    });

    it("returns true when both exercise and quiz passed", () => {
      expect(store.isSessionPassed(
        { status: "in_progress", exercisePassed: true, exerciseScore: 100, quizPassed: true, quizScore: 80 },
        rule,
      )).toBe(true);
    });

    it("returns true when only exercise required and exercise passed", () => {
      const exerciseOnly: UnlockRule = { prerequisites: [], requireExercise: true, requireQuiz: false };
      expect(store.isSessionPassed(
        { status: "in_progress", exercisePassed: true, exerciseScore: 100 },
        exerciseOnly,
      )).toBe(true);
    });

    it("returns true when only quiz required and quiz passed", () => {
      const quizOnly: UnlockRule = { prerequisites: [], requireExercise: false, requireQuiz: true, minQuizScore: 60 };
      expect(store.isSessionPassed(
        { status: "in_progress", quizPassed: true, quizScore: 70 },
        quizOnly,
      )).toBe(true);
    });
  });

  describe("checkAndUnlock", () => {
    it("unlocks session 2 when session 1 is passed", () => {
      const sessions = [makeSession("s1"), makeSession("s2", ["s1"])];
      store.initialize("test-repo", "test-pack", sessions);
      store.updateSessionStatus("s1", "passed", {
        exercisePassed: true, exerciseScore: 100, quizPassed: true, quizScore: 80,
      });

      const unlocked = store.checkAndUnlock(sessions);
      expect(unlocked).toEqual(["s2"]);

      const data = store.load()!;
      expect(data.sessions["s2"].status).toBe("available");
    });

    it("does not unlock when prerequisite quiz score below minQuizScore", () => {
      const sessions = [makeSession("s1"), makeSession("s2", ["s1"])];
      store.initialize("test-repo", "test-pack", sessions);
      store.updateSessionStatus("s1", "passed", {
        exercisePassed: true, exerciseScore: 100, quizPassed: false, quizScore: 40,
      });

      const unlocked = store.checkAndUnlock(sessions);
      expect(unlocked).toEqual([]);

      const data = store.load()!;
      expect(data.sessions["s2"].status).toBe("locked");
    });

    it("does not unlock when prerequisite exercise not passed", () => {
      const sessions = [makeSession("s1"), makeSession("s2", ["s1"])];
      store.initialize("test-repo", "test-pack", sessions);
      store.updateSessionStatus("s1", "passed", {
        exercisePassed: false, exerciseScore: 50, quizPassed: true, quizScore: 80,
      });

      const unlocked = store.checkAndUnlock(sessions);
      expect(unlocked).toEqual([]);
    });

    it("unlocks multiple sessions when prerequisites met", () => {
      const sessions = [
        makeSession("s1"),
        makeSession("s2", ["s1"]),
        makeSession("s3", ["s1"]),
      ];
      store.initialize("test-repo", "test-pack", sessions);
      store.updateSessionStatus("s1", "passed", {
        exercisePassed: true, exerciseScore: 100, quizPassed: true, quizScore: 80,
      });

      const unlocked = store.checkAndUnlock(sessions);
      expect(unlocked).toContain("s2");
      expect(unlocked).toContain("s3");
    });

    it("returns empty array when no sessions can be unlocked", () => {
      const sessions = [makeSession("s1"), makeSession("s2", ["s1"])];
      store.initialize("test-repo", "test-pack", sessions);

      const unlocked = store.checkAndUnlock(sessions);
      expect(unlocked).toEqual([]);
    });
  });
});
