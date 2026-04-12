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
