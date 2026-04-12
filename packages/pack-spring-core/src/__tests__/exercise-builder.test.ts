import { describe, it, expect } from "vitest";
import { buildSpringExerciseSpec } from "../exercise-builder.js";
import type { RepoContext, CodeModel, StudySessionSpec } from "@study-agent/engine-core";

describe("buildSpringExerciseSpec", () => {
  const repo: RepoContext = { rootPath: "/tmp", repoName: "test" };
  const codeModel: CodeModel = { language: "java", files: [], symbols: [], references: [] };

  it("returns exercise spec for session spring.ioc.01", () => {
    const session: StudySessionSpec = {
      id: "spring.ioc.01",
      conceptId: "spring.ioc.01",
      title: "IoC and Bean Metadata",
      learningGoals: ["Understand IoC"],
      explanationOutline: [],
      evidence: [],
    };

    const spec = buildSpringExerciseSpec({ repo, codeModel, session });
    expect(spec).not.toBeNull();
    expect(spec!.id).toBe("ex-di-01");
    expect(spec!.templateBundle).toContain("di-01-ioc-bean-metadata");
    expect(spec!.templateVariables.packageName).toBe("com.studyagent.exercise");
    expect(spec!.starterFiles.length).toBeGreaterThan(0);
    expect(spec!.hiddenTestPlan.testFiles).toContain("ContainerTest.java");
  });

  it("returns null for session without exercise", () => {
    const session: StudySessionSpec = {
      id: "spring.aop.06",
      conceptId: "spring.aop.06",
      title: "AOP",
      learningGoals: [],
      explanationOutline: [],
      evidence: [],
    };

    const spec = buildSpringExerciseSpec({ repo, codeModel, session });
    expect(spec).toBeNull();
  });
});
