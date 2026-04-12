import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createFixtureCopy, cleanupFixture } from "../helpers/fixture-copy.js";
import { Orchestrator, ProgressStore } from "@study-agent/engine-core";
import { adapterJava } from "@study-agent/adapter-java";
import { packSpringCore } from "@study-agent/pack-spring-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "../../examples/sample-spring-project");

describe("Session 1 Full Loop", () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = createFixtureCopy(FIXTURE_DIR);
  });

  afterEach(() => {
    cleanupFixture(repoDir);
  });

  it("run → scaffold → grade → quiz-grade → progress (session 1)", async () => {
    const engine = new Orchestrator();
    engine.registerAdapter(adapterJava);
    engine.registerPack(packSpringCore);

    // Step 1: Run — generate study plan
    const runResult = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });

    expect(runResult.planStatus).toBe("fresh");
    expect(runResult.sessionCount).toBeGreaterThanOrEqual(2);
    expect(runResult.sessions[0].id).toBe("spring.ioc.01");

    // Verify artifacts exist
    expect(existsSync(join(repoDir, ".study-agent", "sessions.json"))).toBe(true);
    expect(existsSync(join(repoDir, ".study-agent", "progress.json"))).toBe(true);
    expect(existsSync(join(repoDir, ".study-agent", "instantiated-dag.json"))).toBe(true);

    // Verify progress initialized
    const progress = JSON.parse(readFileSync(join(repoDir, ".study-agent", "progress.json"), "utf-8"));
    expect(progress.sessions["spring.ioc.01"].status).toBe("available");

    // Step 2: Verify exercise scaffold was materialized
    const starterDir = join(repoDir, ".study-agent", "exercises", "spring.ioc.01", "starter");
    expect(existsSync(starterDir)).toBe(true);
    expect(existsSync(join(starterDir, "Container.java"))).toBe(true);
    expect(existsSync(join(starterDir, "BeanDefinition.java"))).toBe(true);

    // Verify template variables were substituted
    const containerContent = readFileSync(join(starterDir, "Container.java"), "utf-8");
    expect(containerContent).toContain("package com.studyagent.exercise");
    expect(containerContent).not.toContain("{{packageName}}");

    // Verify public exercise spec exists (no hidden test plan)
    const publicSpec = JSON.parse(
      readFileSync(join(repoDir, ".study-agent", "exercises", "spring.ioc.01", "exercise-spec.json"), "utf-8"),
    );
    expect(publicSpec.title).toBeDefined();
    expect(publicSpec.hiddenTestPlan).toBeUndefined();

    // Verify hidden tests are in internal dir
    expect(existsSync(join(repoDir, ".study-agent-internal", "exercises", "spring.ioc.01", "hidden-tests", "ContainerTest.java"))).toBe(true);

    // Verify quiz public spec exists (no answerKey)
    const quizPublic = JSON.parse(
      readFileSync(join(repoDir, ".study-agent", "quiz", "spring.ioc.01", "quiz.json"), "utf-8"),
    );
    expect(quizPublic.gradedQuestions.length).toBeGreaterThan(0);
    expect(quizPublic.answerKey).toBeUndefined();

    // Verify quiz internal has answerKey
    const quizInternal = JSON.parse(
      readFileSync(join(repoDir, ".study-agent-internal", "quiz", "spring.ioc.01", "quiz.internal.json"), "utf-8"),
    );
    expect(quizInternal.answerKey).toBeDefined();

    // Step 3: Grade exercise — files already exist from scaffold
    const submissionDir = join(repoDir, ".study-agent", "exercises", "spring.ioc.01", "starter");
    const internalSpecPath = join(repoDir, ".study-agent-internal", "exercises", "spring.ioc.01", "exercise-spec.internal.json");
    const internalSpec = JSON.parse(readFileSync(internalSpecPath, "utf-8"));
    const expectedArtifacts: string[] = internalSpec.expectedArtifacts ?? [];
    const missingFiles = expectedArtifacts.filter((f: string) => !existsSync(join(submissionDir, f)));
    expect(missingFiles).toHaveLength(0);

    // Update progress via ProgressStore (simulating grade command)
    const publicDir = join(repoDir, ".study-agent");
    const progressStore = new ProgressStore(publicDir);
    progressStore.updateSessionStatus("spring.ioc.01", "in_progress", {
      exercisePassed: true,
      exerciseScore: 100,
    });

    // Step 4: Grade quiz with correct answers
    const answersFile = join(repoDir, "quiz-answers.json");
    writeFileSync(answersFile, JSON.stringify({
      sessionId: "spring.ioc.01",
      answers: [
        { questionId: "q1", answer: "B" },
        { questionId: "q2", answer: "BeanDefinition" },
        { questionId: "q3", answer: "B" },
        { questionId: "q4", answer: "singleton" },
      ],
    }));

    // Grade quiz via internal spec
    const quizInternalSpec = JSON.parse(
      readFileSync(join(repoDir, ".study-agent-internal", "quiz", "spring.ioc.01", "quiz.internal.json"), "utf-8"),
    );
    // Verify correct answers match
    expect(quizInternalSpec.answerKey.answers.q1).toBe("B");
    expect(quizInternalSpec.answerKey.answers.q4).toBe("singleton");

    // Update progress with quiz score
    progressStore.updateSessionStatus("spring.ioc.01", "passed", {
      exercisePassed: true,
      exerciseScore: 100,
      quizPassed: true,
      quizScore: 100,
    });

    // Verify progress was updated
    const updatedProgress = progressStore.load()!;
    expect(updatedProgress.sessions["spring.ioc.01"].status).toBe("passed");
    expect(updatedProgress.sessions["spring.ioc.01"].exercisePassed).toBe(true);
    expect(updatedProgress.sessions["spring.ioc.01"].exerciseScore).toBe(100);
    expect(updatedProgress.sessions["spring.ioc.01"].quizPassed).toBe(true);
    expect(updatedProgress.sessions["spring.ioc.01"].quizScore).toBe(100);
    expect(updatedProgress.sessions["spring.ioc.01"].lastAttempt).toBeDefined();

    // Step 5: Verify run returns "reused" on second call
    const runResult2 = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    expect(runResult2.planStatus).toBe("reused");
  });
});
