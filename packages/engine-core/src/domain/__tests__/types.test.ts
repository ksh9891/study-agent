import { describe, it, expect } from "vitest";
import type {
  RepoContext,
  CodeModel,
  AdapterCapabilities,
  CodeModelResult,
  ConceptNode,
  ConceptEdge,
  ConceptGraph,
  InstantiatedConcept,
  ExcludedConcept,
  InstantiatedDAG,
  StudySessionSpec,
  ExerciseSpecInternal,
  ExerciseSpecPublic,
  GradedQuestion,
  ReflectionQuestion,
  QuizSpecInternal,
  QuizSpecPublic,
  EvaluationResult,
  TestStrategy,
  PackRequirements,
  ExtensionManifest,
  EvidenceRule,
  EvidenceEntry,
  CodeEvidence,
  StarterFile,
  UnlockRule,
  NormalizationRule,
  SessionStatus,
  SessionProgress,
  ProgressData,
} from "../types.js";

describe("domain types", () => {
  it("RepoContext can be constructed", () => {
    const ctx: RepoContext = {
      rootPath: "/tmp/repo",
      repoName: "my-repo",
    };
    expect(ctx.rootPath).toBe("/tmp/repo");
  });

  it("CodeModelResult includes capabilities", () => {
    const result: CodeModelResult = {
      codeModel: {
        language: "java",
        files: [],
        symbols: [],
        references: [],
      },
      capabilities: {
        fileIndex: true,
        dependencies: true,
        annotations: true,
        imports: true,
        inheritance: true,
        shallowSymbols: false,
        references: false,
        callGraph: false,
      },
    };
    expect(result.capabilities.fileIndex).toBe(true);
    expect(result.capabilities.callGraph).toBe(false);
  });

  it("ConceptNode is canonical (no repo-specific evidence)", () => {
    const node: ConceptNode = {
      id: "spring.ioc.01",
      title: "IoC and Bean Metadata",
      summary: "Understanding Inversion of Control",
      difficulty: "beginner",
      inclusionPolicy: "required",
      stage: "core",
      evidenceRules: [
        { type: "annotation", pattern: "@Component" },
      ],
    };
    expect(node.inclusionPolicy).toBe("required");
    expect("evidenceEntries" in node).toBe(false);
  });

  it("InstantiatedDAG represents repo-specific subset", () => {
    const dag: InstantiatedDAG = {
      packId: "@study-agent/pack-spring-core",
      repoContext: { repoName: "demo", rootPath: "/tmp" },
      includedConcepts: [
        {
          conceptId: "spring.ioc.01",
          evidenceScore: 0.9,
          evidenceEntries: [
            { file: "src/AppConfig.java", lineStart: 1, lineEnd: 10, pattern: "@Configuration" },
          ],
          inclusionReason: "required",
        },
      ],
      excludedConcepts: [],
      conceptOrder: ["spring.ioc.01"],
    };
    expect(dag.includedConcepts).toHaveLength(1);
    expect(dag.conceptOrder).toEqual(["spring.ioc.01"]);
  });

  it("QuizSpecPublic excludes answerKey", () => {
    const pub: QuizSpecPublic = {
      id: "quiz-01",
      sessionId: "spring.ioc.01",
      gradedQuestions: [
        { id: "q1", type: "multiple_choice", prompt: "What is IoC?", choices: ["A", "B"], weight: 1 },
      ],
      passingScore: 70,
    };
    expect("answerKey" in pub).toBe(false);
  });

  it("ExerciseSpecPublic excludes hiddenTestPlan and templateBundle", () => {
    const pub: ExerciseSpecPublic = {
      id: "ex-01",
      sessionId: "spring.ioc.01",
      title: "Mini DI Container",
      prompt: "Implement a simple DI container",
      starterFiles: [{ path: "Container.java", description: "Main container" }],
      expectedArtifacts: ["Container.java"],
      repoAnchors: [],
      hints: ["Think about how beans are stored"],
    };
    expect("hiddenTestPlan" in pub).toBe(false);
    expect("templateBundle" in pub).toBe(false);
  });

  it("ProgressData tracks session states", () => {
    const progress: ProgressData = {
      schemaVersion: "0.1",
      repo: "spring-demo",
      packId: "@study-agent/pack-spring-core",
      sessions: {
        "spring.ioc.01": { status: "passed", exerciseScore: 100, quizScore: 85 },
        "spring.di.02": { status: "locked" },
      },
    };
    expect(progress.sessions["spring.ioc.01"].status).toBe("passed");
  });
});
