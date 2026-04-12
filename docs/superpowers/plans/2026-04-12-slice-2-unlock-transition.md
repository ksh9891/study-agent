# Slice 2: Session 2 + Unlock Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MVP 1.0 finish line — two sessions fully working with unlock transition between them.

**Architecture:** Extend progress-store with sub-result model (exercisePassed/quizPassed) and auto-unlock logic. Modify grade/grade-quiz commands to use the new model. Add `next` command and session 2 content (exercise bundle + quiz). Add `planStatus: stale` detection and `/study-agent:next` plugin skill.

**Tech Stack:** TypeScript, Vitest, pnpm monorepo, Commander.js CLI

---

### Task 1: Extend SessionProgress type with sub-result fields

**Files:**
- Modify: `packages/engine-core/src/domain/types.ts:391-398`

- [ ] **Step 1: Update SessionProgress interface**

In `packages/engine-core/src/domain/types.ts`, replace the `SessionProgress` interface:

```ts
export interface SessionProgress {
  status: SessionStatus;
  exercisePassed?: boolean;
  exerciseScore?: number;
  quizPassed?: boolean;
  quizScore?: number;
  lastAttempt?: string;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds successfully, no type errors

- [ ] **Step 3: Commit**

```bash
git add packages/engine-core/src/domain/types.ts
git commit -m "feat(engine-core): add exercisePassed/quizPassed to SessionProgress"
```

---

### Task 2: Add isSessionPassed() and checkAndUnlock() to ProgressStore

**Files:**
- Modify: `packages/engine-core/src/progress/progress-store.ts`
- Create: `packages/engine-core/src/progress/progress-store.test.ts`

- [ ] **Step 1: Write failing tests for isSessionPassed**

Create `packages/engine-core/src/progress/progress-store.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProgressStore } from "./progress-store.js";
import type { StudySessionSpec, UnlockRule } from "../domain/types.js";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run packages/engine-core/src/progress/progress-store.test.ts`
Expected: FAIL — `isSessionPassed` and `checkAndUnlock` not defined

- [ ] **Step 3: Implement isSessionPassed and checkAndUnlock**

Replace the full content of `packages/engine-core/src/progress/progress-store.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run packages/engine-core/src/progress/progress-store.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add packages/engine-core/src/progress/progress-store.ts packages/engine-core/src/progress/progress-store.test.ts
git commit -m "feat(engine-core): add isSessionPassed and checkAndUnlock to ProgressStore"
```

---

### Task 3: Update grade command to use sub-result model + auto-unlock

**Files:**
- Modify: `apps/engine-cli/src/commands/grade.ts`

- [ ] **Step 1: Update grade.ts**

Replace the full content of `apps/engine-cli/src/commands/grade.ts`:

```ts
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
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds successfully

- [ ] **Step 3: Commit**

```bash
git add apps/engine-cli/src/commands/grade.ts
git commit -m "feat(engine-cli): update grade to use sub-result model and auto-unlock"
```

---

### Task 4: Update grade-quiz command to use sub-result model + auto-unlock

**Files:**
- Modify: `apps/engine-cli/src/commands/grade-quiz.ts`

- [ ] **Step 1: Update grade-quiz.ts**

Replace the full content of `apps/engine-cli/src/commands/grade-quiz.ts`:

```ts
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { formatSuccess, formatError } from "../helpers/output.js";
import { ProgressStore } from "@study-agent/engine-core";
import type { QuizSpecInternal, NormalizationRule, StudySessionSpec } from "@study-agent/engine-core";

export async function gradeQuizCommand(repoPath: string, sessionId: string, answersFile: string): Promise<string> {
  const quizInternalPath = join(repoPath, ".study-agent-internal", "quiz", sessionId, "quiz.internal.json");
  if (!existsSync(quizInternalPath)) {
    return formatError("grade-quiz", repoPath, "QUIZ_NOT_FOUND", `No quiz spec for session ${sessionId}`);
  }
  if (!existsSync(answersFile)) {
    return formatError("grade-quiz", repoPath, "ANSWERS_NOT_FOUND", `Answers file not found: ${answersFile}`);
  }

  const quizSpec: QuizSpecInternal = JSON.parse(readFileSync(quizInternalPath, "utf-8"));
  const userAnswers: { answers: Array<{ questionId: string; answer: string }> } = JSON.parse(readFileSync(answersFile, "utf-8"));

  let totalWeight = 0;
  let earnedWeight = 0;
  const results: Array<{ questionId: string; correct: boolean; userAnswer: string; expected?: string }> = [];

  for (const question of quizSpec.gradedQuestions) {
    totalWeight += question.weight;
    const userEntry = userAnswers.answers.find((a) => a.questionId === question.id);
    const userAnswer = userEntry?.answer ?? "";
    const correctAnswer = quizSpec.answerKey.answers[question.id];
    const isCorrect = matchAnswer(userAnswer, correctAnswer, quizSpec.normalizationRules);

    if (isCorrect) earnedWeight += question.weight;
    results.push({
      questionId: question.id,
      correct: isCorrect,
      userAnswer,
      expected: isCorrect ? undefined : String(correctAnswer),
    });
  }

  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
  const quizPassed = score >= quizSpec.passingScore;

  const publicDir = join(repoPath, ".study-agent");
  const progressStore = new ProgressStore(publicDir);

  // Update quiz sub-result
  const currentProgress = progressStore.load();
  const currentSession = currentProgress?.sessions[sessionId];
  progressStore.updateSessionStatus(sessionId, "in_progress", {
    exercisePassed: currentSession?.exercisePassed,
    exerciseScore: currentSession?.exerciseScore,
    quizPassed,
    quizScore: score,
  });

  const result: Record<string, unknown> = { passed: quizPassed, score, passingScore: quizSpec.passingScore, results };

  // Check if overall session is now passed
  if (quizPassed) {
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

  return formatSuccess("grade-quiz", repoPath, result);
}

function matchAnswer(
  userAnswer: string,
  correctAnswer: string | string[],
  rules: NormalizationRule[],
): boolean {
  const candidates = typeof correctAnswer === "string" ? [correctAnswer] : correctAnswer;

  for (const candidate of candidates) {
    let normalized = userAnswer;
    let correctNormalized = candidate;

    for (const rule of rules) {
      if (rule.type === "case_insensitive") {
        normalized = normalized.toLowerCase();
        correctNormalized = correctNormalized.toLowerCase();
      }
      if (rule.type === "trim_whitespace") {
        normalized = normalized.trim();
        correctNormalized = correctNormalized.trim();
      }
    }

    if (normalized === correctNormalized) return true;

    for (const rule of rules) {
      if (rule.type === "alias" && rule.aliases) {
        const aliases = rule.aliases[correctNormalized.toLowerCase()] ?? [];
        if (aliases.some((a) => a.toLowerCase() === normalized.toLowerCase())) return true;
      }
    }
  }

  return false;
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds successfully

- [ ] **Step 3: Commit**

```bash
git add apps/engine-cli/src/commands/grade-quiz.ts
git commit -m "feat(engine-cli): update grade-quiz to use sub-result model and auto-unlock"
```

---

### Task 5: Add `next` command

**Files:**
- Create: `apps/engine-cli/src/commands/next.ts`
- Modify: `apps/engine-cli/src/index.ts`

- [ ] **Step 1: Create next.ts**

Create `apps/engine-cli/src/commands/next.ts`:

```ts
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
```

- [ ] **Step 2: Register next command in index.ts**

In `apps/engine-cli/src/index.ts`, add the import at line 6:

```ts
import { nextCommand } from "./commands/next.js";
```

And add the command block before `program.parse()`:

```ts
program
  .command("next")
  .description("Recommend next study session")
  .requiredOption("--repo <path>", "Path to target repository")
  .option("--json", "Output as JSON", true)
  .action(async (opts) => {
    const repoPath = resolveRepoPath(opts.repo);
    console.log(await nextCommand(repoPath));
  });
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: builds successfully

- [ ] **Step 4: Commit**

```bash
git add apps/engine-cli/src/commands/next.ts apps/engine-cli/src/index.ts
git commit -m "feat(engine-cli): add next command for session recommendation"
```

---

### Task 6: Add planStatus: stale detection

**Files:**
- Modify: `packages/engine-core/src/orchestrator.ts`

- [ ] **Step 1: Update orchestrator.ts reused check to detect stale**

In `packages/engine-core/src/orchestrator.ts`, replace the existing plan check block (lines 39-54):

```ts
    // Check for existing plan
    const sessionsPath = join(publicDir, "sessions.json");
    if (!opts?.force && existsSync(sessionsPath)) {
      const existing = JSON.parse(readFileSync(sessionsPath, "utf-8"));
      const progress = progressStore.load();
      if (progress) {
        // Detect stale: rebuild sessions and compare IDs
        const langResult = await this.adapterRegistry.detectLanguage(repo);
        if (langResult) {
          const codeModelResult = await this.adapterRegistry.buildCodeModel(langResult.adapter, repo);
          const packResult = await this.packRegistry.selectBestPack({
            repo,
            codeModel: codeModelResult.codeModel,
            capabilities: codeModelResult.capabilities,
            language: langResult.result,
          });
          if (packResult) {
            const evidenceMap = await packResult.pack.collectEvidence({ repo, codeModel: codeModelResult.codeModel });
            const dag = await packResult.pack.instantiateDAG({ evidenceMap });
            const existingIds = (existing.sessions as StudySessionSpec[]).map((s) => s.id);
            const currentIds = dag.conceptOrder;
            const isStale = existingIds.length !== currentIds.length || existingIds.some((id, i) => id !== currentIds[i]);

            if (isStale) {
              return {
                planStatus: "stale",
                packId: progress.packId,
                sessionCount: existing.sessions.length,
                sessions: existing.sessions,
                progress,
              };
            }
          }
        }

        return {
          planStatus: "reused",
          packId: progress.packId,
          sessionCount: existing.sessions.length,
          sessions: existing.sessions,
          progress,
        };
      }
      // progress.json missing (interrupted run) — fall through to regenerate
    }
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: builds successfully

- [ ] **Step 3: Run existing tests**

Run: `pnpm test`
Expected: existing session-1-full-loop tests still pass (reused detection still works)

- [ ] **Step 4: Commit**

```bash
git add packages/engine-core/src/orchestrator.ts
git commit -m "feat(engine-core): add planStatus stale detection in orchestrator"
```

---

### Task 7: Author session 2 exercise bundle

**Files:**
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/exercise.yaml`
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/starter/BeanDefinitionRegistry.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/starter/SimpleBeanDefinitionRegistry.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/starter/Component.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/starter/ComponentScanner.java.tmpl`
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/starter/README.md`
- Create: `packages/pack-spring-core/exercises/di-02-bean-registration/hidden-tests/RegistryTest.java`

- [ ] **Step 1: Create exercise.yaml**

Create `packages/pack-spring-core/exercises/di-02-bean-registration/exercise.yaml`:

```yaml
id: ex-di-02
sessionId: spring.di.02
title: "Bean Registration and Component Scanning"
prompt: "Implement a BeanDefinitionRegistry and a ComponentScanner that discovers @Component-annotated classes from a given candidate list"
templateVariables:
  packageName: "com.studyagent.exercise"
starterFiles:
  - path: "BeanDefinitionRegistry.java"
    description: "Registry interface for bean definitions"
  - path: "SimpleBeanDefinitionRegistry.java"
    description: "Registry implementation"
  - path: "Component.java"
    description: "@Component annotation"
  - path: "ComponentScanner.java"
    description: "Scans candidate classes for @Component"
expectedArtifacts:
  - "BeanDefinitionRegistry.java"
  - "SimpleBeanDefinitionRegistry.java"
  - "Component.java"
  - "ComponentScanner.java"
hints:
  - "BeanDefinitionRegistry needs register, get, and getAll methods"
  - "ComponentScanner.scan() takes Class<?>[] candidates, not a package string"
  - "Use Class.isAnnotationPresent() to check for @Component"
```

- [ ] **Step 2: Create starter templates**

Create `packages/pack-spring-core/exercises/di-02-bean-registration/starter/BeanDefinitionRegistry.java.tmpl`:

```java
package {{packageName}};

/**
 * Registry for storing and retrieving BeanDefinitions.
 * TODO: Define register, get, and getAll methods.
 */
public interface BeanDefinitionRegistry {
    // TODO: Define the interface
}
```

Create `packages/pack-spring-core/exercises/di-02-bean-registration/starter/SimpleBeanDefinitionRegistry.java.tmpl`:

```java
package {{packageName}};

import java.util.Map;
import java.util.HashMap;
import java.util.Collection;

/**
 * Simple in-memory implementation of BeanDefinitionRegistry.
 * TODO: Implement register, get, and getAll using a HashMap.
 */
public class SimpleBeanDefinitionRegistry implements BeanDefinitionRegistry {
    // TODO: Implement registry logic
}
```

Create `packages/pack-spring-core/exercises/di-02-bean-registration/starter/Component.java.tmpl`:

```java
package {{packageName}};

import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import java.lang.annotation.ElementType;

/**
 * Marks a class as a Spring-managed component.
 * This is a simplified version of Spring's @Component.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface Component {
    String value() default "";
}
```

Create `packages/pack-spring-core/exercises/di-02-bean-registration/starter/ComponentScanner.java.tmpl`:

```java
package {{packageName}};

/**
 * Scans a given list of candidate classes for @Component annotation
 * and registers them as BeanDefinitions in a registry.
 * TODO: Implement scan(BeanDefinitionRegistry, Class<?>...) method.
 */
public class ComponentScanner {
    // TODO: Implement scanning logic
}
```

Create `packages/pack-spring-core/exercises/di-02-bean-registration/starter/README.md`:

```markdown
# Bean Registration and Component Scanning Exercise

Implement a bean definition registry and a component scanner.

## Requirements
1. `BeanDefinitionRegistry` interface with `register(BeanDefinition)`, `get(String name)`, `getAll()` methods
2. `SimpleBeanDefinitionRegistry` implements the interface using a HashMap
3. `@Component` annotation is provided — do not modify it
4. `ComponentScanner.scan(registry, candidates...)` finds @Component classes, creates BeanDefinitions, and registers them
5. If `@Component(value="myName")` is given, use that as the bean name; otherwise use the simple class name in lowercase
6. Duplicate registrations overwrite the previous entry
```

- [ ] **Step 3: Create hidden test**

Create `packages/pack-spring-core/exercises/di-02-bean-registration/hidden-tests/RegistryTest.java`:

```java
package com.studyagent.exercise;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

@Component
class SampleService {}

@Component("myRepo")
class SampleRepository {}

class NotAComponent {}

class RegistryTest {
    @Test
    void testRegisterAndGet() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        BeanDefinition def = new BeanDefinition("greeting", String.class);
        registry.register(def);
        BeanDefinition retrieved = registry.get("greeting");
        assertNotNull(retrieved);
        assertEquals("greeting", retrieved.getName());
        assertEquals(String.class, retrieved.getBeanClass());
    }

    @Test
    void testGetReturnsNullForUnknown() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        assertNull(registry.get("nonexistent"));
    }

    @Test
    void testGetAllReturnsList() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        registry.register(new BeanDefinition("a", String.class));
        registry.register(new BeanDefinition("b", Integer.class));
        assertEquals(2, registry.getAll().size());
    }

    @Test
    void testDuplicateRegistrationOverwrites() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        registry.register(new BeanDefinition("x", String.class));
        registry.register(new BeanDefinition("x", Integer.class));
        assertEquals(Integer.class, registry.get("x").getBeanClass());
    }

    @Test
    void testComponentScannerRegistersAnnotatedClasses() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        ComponentScanner scanner = new ComponentScanner();
        scanner.scan(registry, SampleService.class, SampleRepository.class, NotAComponent.class);
        assertNotNull(registry.get("sampleservice"));
        assertNotNull(registry.get("myRepo"));
        assertNull(registry.get("notacomponent"));
    }

    @Test
    void testComponentScannerUsesAnnotationValue() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        ComponentScanner scanner = new ComponentScanner();
        scanner.scan(registry, SampleRepository.class);
        BeanDefinition def = registry.get("myRepo");
        assertNotNull(def);
        assertEquals(SampleRepository.class, def.getBeanClass());
    }

    @Test
    void testComponentScannerUsesClassNameWhenNoValue() {
        SimpleBeanDefinitionRegistry registry = new SimpleBeanDefinitionRegistry();
        ComponentScanner scanner = new ComponentScanner();
        scanner.scan(registry, SampleService.class);
        BeanDefinition def = registry.get("sampleservice");
        assertNotNull(def);
        assertEquals(SampleService.class, def.getBeanClass());
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/pack-spring-core/exercises/di-02-bean-registration/
git commit -m "feat(pack-spring-core): add session 2 exercise bundle (bean registration)"
```

---

### Task 8: Wire session 2 exercise and quiz into pack builders

**Files:**
- Modify: `packages/pack-spring-core/src/exercise-builder.ts`
- Modify: `packages/pack-spring-core/src/quiz-builder.ts`

- [ ] **Step 1: Add session 2 to exercise builder**

In `packages/pack-spring-core/src/exercise-builder.ts`, update the `SESSION_TO_EXERCISE` map:

```ts
const SESSION_TO_EXERCISE: Record<string, string> = {
  "spring.ioc.01": "di-01-ioc-bean-metadata",
  "spring.di.02": "di-02-bean-registration",
};
```

And update the `hiddenTestPlan` section to be dynamic based on the exercise directory. Replace the hardcoded return block (lines 46-65) with:

```ts
  const hiddenTestFiles: Record<string, string[]> = {
    "di-01-ioc-bean-metadata": ["ContainerTest.java"],
    "di-02-bean-registration": ["RegistryTest.java"],
  };

  return {
    id: config.id as string,
    sessionId: input.session.id,
    title: config.title as string,
    prompt: config.prompt as string,
    templateBundle: exercisePath,
    templateVariables,
    starterFiles,
    expectedArtifacts: config.expectedArtifacts as string[] ?? [],
    repoAnchors: input.session.evidence.slice(0, 3),
    hiddenTestPlan: {
      testFiles: hiddenTestFiles[exerciseDir] ?? [],
      runner: "javac+junit",
      command: "javac",
      args: [],
      timeout: 30_000,
    },
    hints: config.hints as string[] ?? [],
  };
```

- [ ] **Step 2: Add session 2 quiz spec**

In `packages/pack-spring-core/src/quiz-builder.ts`, add the session 2 entry to the `QUIZ_SPECS` record after the `spring.ioc.01` entry:

```ts
  "spring.di.02": {
    id: "quiz-di-02",
    gradedQuestions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "What is the primary role of BeanDefinitionRegistry in Spring?",
        choices: [
          "A) To create bean instances",
          "B) To store and manage bean definitions before instantiation",
          "C) To inject dependencies into beans",
          "D) To handle bean lifecycle callbacks",
        ],
        weight: 25,
      },
      {
        id: "q2",
        type: "short_answer",
        prompt: "What does a ComponentScanner do when it encounters a class annotated with @Component?",
        weight: 25,
      },
      {
        id: "q3",
        type: "multiple_choice",
        prompt: "What is the key difference between bean registration and bean instantiation?",
        choices: [
          "A) They are the same thing",
          "B) Registration stores metadata (BeanDefinition), instantiation creates the actual object",
          "C) Registration creates objects, instantiation stores metadata",
          "D) Registration happens at runtime, instantiation at compile time",
        ],
        weight: 25,
      },
      {
        id: "q4",
        type: "short_answer",
        prompt: "In our exercise, ComponentScanner.scan() takes an explicit Class[] list instead of scanning a package. What is the practical reason for this simplification?",
        weight: 25,
      },
    ],
    reflectionQuestions: [
      {
        id: "r1",
        prompt: "Why does Spring separate bean registration (storing BeanDefinitions) from bean creation (instantiation)?",
        rubric: [
          "Mentions separation of metadata from actual objects",
          "Mentions benefits like lazy init, scope control, or dependency ordering",
        ],
        expectedPoints: [
          "The container needs to know all beans before creating any, so it can resolve dependencies",
          "Separation enables lazy initialization, scope management, and circular dependency detection",
        ],
        feedbackHints: ["Think about what happens when Bean A depends on Bean B which depends on Bean C"],
      },
    ],
    answerKey: {
      answers: {
        q1: "B",
        q2: "BeanDefinition",
        q3: "B",
        q4: ["classpath scanning", "avoid classpath scanning"],
      },
    },
    passingScore: 60,
    normalizationRules: [
      { type: "case_insensitive" },
      { type: "trim_whitespace" },
      {
        type: "alias",
        aliases: {
          "beandefinition": ["creates a BeanDefinition", "registers a BeanDefinition", "creates a bean definition and registers it"],
          "classpath scanning": ["no classpath scanning needed", "avoid classpath scanning complexity", "classpath scanning is complex in Java"],
          "avoid classpath scanning": ["classpath scanning is complex", "simplifies testing", "no need for real classpath"],
        },
      },
    ],
  },
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: builds successfully

- [ ] **Step 4: Commit**

```bash
git add packages/pack-spring-core/src/exercise-builder.ts packages/pack-spring-core/src/quiz-builder.ts
git commit -m "feat(pack-spring-core): wire session 2 exercise and quiz into builders"
```

---

### Task 9: Add `/study-agent:next` plugin skill

**Files:**
- Create: `plugins/study-agent/skills/next/SKILL.md`

- [ ] **Step 1: Create SKILL.md**

Create `plugins/study-agent/skills/next/SKILL.md`:

```markdown
---
name: next
description: Recommend the next study session based on current progress
---

# /study-agent:next

Show the user which study session to work on next.

## Steps

1. Run the engine next command:

```bash
study-agent-engine next --repo . --json
```

2. Parse the JSON output and present it to the user:

**If `reason` is `in_progress`:**
> You have an ongoing session: **{title}**
> Learning goals: {learningGoals as bullet list}
> Continue with `/study-agent:exercise` to work on the exercise.

**If `reason` is `next_available`:**
> Next session unlocked: **{title}**
> Learning goals: {learningGoals as bullet list}
> Start with `/study-agent:run` to review the explanation, then `/study-agent:exercise`.

**If `reason` is `all_completed`:**
> All sessions completed! You've finished the study plan.
> Run `/study-agent:progress` to review your results.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/study-agent/skills/next/SKILL.md
git commit -m "feat(plugin): add /study-agent:next skill"
```

---

### Task 10: Integration test — 2-session unlock transition

**Files:**
- Create: `tests/integration/session-2-unlock-transition.test.ts`

- [ ] **Step 1: Write the integration test**

Create `tests/integration/session-2-unlock-transition.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createFixtureCopy, cleanupFixture } from "../helpers/fixture-copy.js";
import { Orchestrator, ProgressStore } from "@study-agent/engine-core";
import { adapterJava } from "@study-agent/adapter-java";
import { packSpringCore } from "@study-agent/pack-spring-core";
import type { StudySessionSpec } from "@study-agent/engine-core";

const FIXTURE_DIR = join(import.meta.dirname!, "../../examples/sample-spring-project");

describe("Session 2 Unlock Transition", () => {
  let repoDir: string;
  let engine: Orchestrator;
  let publicDir: string;
  let progressStore: ProgressStore;

  beforeEach(() => {
    repoDir = createFixtureCopy(FIXTURE_DIR);
    engine = new Orchestrator();
    engine.registerAdapter(adapterJava);
    engine.registerPack(packSpringCore);
    publicDir = join(repoDir, ".study-agent");
    progressStore = new ProgressStore(publicDir);
  });

  afterEach(() => {
    cleanupFixture(repoDir);
  });

  it("full 2-session unlock flow: run → grade → quiz → unlock → next → session 2", async () => {
    // Step 1: Run — generate study plan
    const runResult = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    expect(runResult.planStatus).toBe("fresh");
    expect(runResult.sessionCount).toBeGreaterThanOrEqual(2);

    const sessions: StudySessionSpec[] = runResult.sessions;
    expect(sessions[0].id).toBe("spring.ioc.01");
    expect(sessions[1].id).toBe("spring.di.02");

    // Verify initial progress
    const initialProgress = progressStore.load()!;
    expect(initialProgress.sessions["spring.ioc.01"].status).toBe("available");
    expect(initialProgress.sessions["spring.di.02"].status).toBe("locked");

    // Step 2: Grade session 1 exercise — should NOT make session passed yet
    progressStore.updateSessionStatus("spring.ioc.01", "in_progress", {
      exercisePassed: true,
      exerciseScore: 100,
    });
    // Session 2 should still be locked (quiz not done yet)
    const afterExercise = progressStore.load()!;
    expect(afterExercise.sessions["spring.ioc.01"].status).toBe("in_progress");
    expect(afterExercise.sessions["spring.ioc.01"].exercisePassed).toBe(true);
    expect(afterExercise.sessions["spring.di.02"].status).toBe("locked");

    // No unlock should happen with only exercise passed
    const noUnlock = progressStore.checkAndUnlock(sessions);
    expect(noUnlock).toEqual([]);

    // Step 3: Grade session 1 quiz — score >= 60, now overall passed
    progressStore.updateSessionStatus("spring.ioc.01", "passed", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: true,
      quizScore: 100,
    });

    // checkAndUnlock should unlock session 2
    const unlocked = progressStore.checkAndUnlock(sessions);
    expect(unlocked).toEqual(["spring.di.02"]);

    const afterUnlock = progressStore.load()!;
    expect(afterUnlock.sessions["spring.ioc.01"].status).toBe("passed");
    expect(afterUnlock.sessions["spring.di.02"].status).toBe("available");

    // Step 4: Verify session 2 exercise artifacts were materialized
    const session2StarterDir = join(repoDir, ".study-agent", "exercises", "spring.di.02", "starter");
    expect(existsSync(session2StarterDir)).toBe(true);
    expect(existsSync(join(session2StarterDir, "BeanDefinitionRegistry.java"))).toBe(true);
    expect(existsSync(join(session2StarterDir, "SimpleBeanDefinitionRegistry.java"))).toBe(true);
    expect(existsSync(join(session2StarterDir, "Component.java"))).toBe(true);
    expect(existsSync(join(session2StarterDir, "ComponentScanner.java"))).toBe(true);

    // Verify template variables substituted
    const registryContent = readFileSync(join(session2StarterDir, "BeanDefinitionRegistry.java"), "utf-8");
    expect(registryContent).toContain("package com.studyagent.exercise");
    expect(registryContent).not.toContain("{{packageName}}");

    // Verify session 2 quiz exists
    expect(existsSync(join(repoDir, ".study-agent", "quiz", "spring.di.02", "quiz.json"))).toBe(true);
    expect(existsSync(join(repoDir, ".study-agent-internal", "quiz", "spring.di.02", "quiz.internal.json"))).toBe(true);

    // Verify session 2 hidden tests
    expect(existsSync(join(repoDir, ".study-agent-internal", "exercises", "spring.di.02", "hidden-tests", "RegistryTest.java"))).toBe(true);

    // Step 5: Grade session 2 exercise
    progressStore.updateSessionStatus("spring.di.02", "in_progress", {
      exercisePassed: true,
      exerciseScore: 100,
    });

    // Step 6: Grade session 2 quiz
    progressStore.updateSessionStatus("spring.di.02", "passed", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: true,
      quizScore: 80,
    });

    // Session 3 should unlock
    const unlocked2 = progressStore.checkAndUnlock(sessions);
    expect(unlocked2).toContain("spring.di.03");

    const finalProgress = progressStore.load()!;
    expect(finalProgress.sessions["spring.di.02"].status).toBe("passed");
    expect(finalProgress.sessions["spring.di.03"].status).toBe("available");
  });

  it("quiz score below threshold does not unlock next session", async () => {
    const runResult = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    const sessions = runResult.sessions;

    // Pass exercise but fail quiz (score < 60)
    progressStore.updateSessionStatus("spring.ioc.01", "in_progress", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: false,
      quizScore: 40,
    });

    // Should NOT unlock session 2
    const unlocked = progressStore.checkAndUnlock(sessions);
    expect(unlocked).toEqual([]);
    expect(progressStore.load()!.sessions["spring.di.02"].status).toBe("locked");
  });

  it("quiz retry after failure unlocks next session", async () => {
    const runResult = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    const sessions = runResult.sessions;

    // First attempt: exercise pass, quiz fail
    progressStore.updateSessionStatus("spring.ioc.01", "in_progress", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: false,
      quizScore: 40,
    });
    expect(progressStore.checkAndUnlock(sessions)).toEqual([]);

    // Retry: quiz pass
    progressStore.updateSessionStatus("spring.ioc.01", "passed", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: true,
      quizScore: 75,
    });
    const unlocked = progressStore.checkAndUnlock(sessions);
    expect(unlocked).toEqual(["spring.di.02"]);
  });

  it("run returns reused on second call", async () => {
    await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    const result2 = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    expect(result2.planStatus).toBe("reused");
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `pnpm vitest run tests/integration/session-2-unlock-transition.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 3: Run all tests to verify no regressions**

Run: `pnpm test`
Expected: All tests pass (both session-1-full-loop and session-2-unlock-transition)

- [ ] **Step 4: Commit**

```bash
git add tests/integration/session-2-unlock-transition.test.ts
git commit -m "test: add integration test for 2-session unlock transition"
```

---

### Task 11: Update session 1 integration test for sub-result compatibility

**Files:**
- Modify: `tests/integration/session-1-full-loop.test.ts`

The existing test uses `progressStore.updateSessionStatus("spring.ioc.01", "passed", { exerciseScore: 100 })` which sets status to `passed` directly after exercise only. This is inconsistent with the new sub-result model. Update it.

- [ ] **Step 1: Update the test**

In `tests/integration/session-1-full-loop.test.ts`, replace the grade exercise block (lines 88-90):

```ts
    // Update progress via ProgressStore (simulating grade command)
    const publicDir = join(repoDir, ".study-agent");
    const progressStore = new ProgressStore(publicDir);
    progressStore.updateSessionStatus("spring.ioc.01", "passed", { exerciseScore: 100 });
```

with:

```ts
    // Update progress via ProgressStore (simulating grade command)
    const publicDir = join(repoDir, ".study-agent");
    const progressStore = new ProgressStore(publicDir);
    progressStore.updateSessionStatus("spring.ioc.01", "in_progress", {
      exercisePassed: true,
      exerciseScore: 100,
    });
```

And replace the quiz grade line (line 113):

```ts
    progressStore.updateSessionStatus("spring.ioc.01", "passed", { quizScore: 100 });
```

with:

```ts
    progressStore.updateSessionStatus("spring.ioc.01", "passed", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: true,
      quizScore: 100,
    });
```

And update the assertions (lines 117-119) to also check the new fields:

```ts
    const updatedProgress = progressStore.load()!;
    expect(updatedProgress.sessions["spring.ioc.01"].status).toBe("passed");
    expect(updatedProgress.sessions["spring.ioc.01"].exercisePassed).toBe(true);
    expect(updatedProgress.sessions["spring.ioc.01"].exerciseScore).toBe(100);
    expect(updatedProgress.sessions["spring.ioc.01"].quizPassed).toBe(true);
    expect(updatedProgress.sessions["spring.ioc.01"].quizScore).toBe(100);
    expect(updatedProgress.sessions["spring.ioc.01"].lastAttempt).toBeDefined();
```

- [ ] **Step 2: Run test**

Run: `pnpm vitest run tests/integration/session-1-full-loop.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/session-1-full-loop.test.ts
git commit -m "test: update session 1 test for sub-result model compatibility"
```

---

### Task 12: Final verification

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: ALL tests pass

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: builds successfully, no type errors

- [ ] **Step 3: Verify file structure**

Run: `find packages/pack-spring-core/exercises/di-02-bean-registration -type f`

Expected:
```
exercise.yaml
starter/BeanDefinitionRegistry.java.tmpl
starter/SimpleBeanDefinitionRegistry.java.tmpl
starter/Component.java.tmpl
starter/ComponentScanner.java.tmpl
starter/README.md
hidden-tests/RegistryTest.java
```
