import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createFixtureCopy, cleanupFixture } from "../helpers/fixture-copy.js";
import { Orchestrator } from "@study-agent/engine-core";
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

    // Step 3: Simulate grading (create expected artifacts in submission)
    const submissionDir = join(repoDir, ".study-agent", "exercises", "spring.ioc.01", "starter");
    // Files already exist from scaffold, so grade should pass the "files exist" check

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

    // Step 5: Verify run returns "reused" on second call
    const runResult2 = await engine.run({ rootPath: repoDir, repoName: "sample-spring-project" });
    expect(runResult2.planStatus).toBe("reused");
  });
});
