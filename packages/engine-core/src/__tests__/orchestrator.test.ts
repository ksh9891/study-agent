import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Orchestrator } from "../orchestrator.js";
import type { LanguageAdapter, StudyPack, CodeModelResult, PackMatchResult, EvidenceMap } from "../domain/types.js";

const mockAdapter: LanguageAdapter = {
  manifest: { id: "mock-java", name: "Mock", version: "0.1.0", apiVersion: "0.1", kind: "language-adapter" },
  async detect() {
    return { language: "java", confidence: 0.9, buildTool: "maven" };
  },
  async buildCodeModel() {
    return {
      codeModel: {
        language: "java",
        files: [{
          path: "AppConfig.java",
          annotations: ["@Configuration", "@Bean"],
          imports: ["org.springframework.context.annotation.Configuration"],
          classes: [{ name: "AppConfig", kind: "class" as const }],
        }],
        symbols: [],
        references: [],
      },
      capabilities: {
        fileIndex: true, dependencies: true, annotations: true,
        imports: true, inheritance: true, shallowSymbols: false,
        references: false, callGraph: false,
      },
    };
  },
  async getTestStrategy() {
    return { runner: "maven" as const, command: "mvn", args: ["test"], workingDir: "." };
  },
};

const mockPack: StudyPack = {
  manifest: { id: "mock-pack", name: "Mock Pack", version: "0.1.0", apiVersion: "0.1", kind: "study-pack" },
  requirements: { requiredCapabilities: { annotations: true }, degradationRules: [] },
  async detect() {
    return { packId: "mock-pack", score: 0.9, confidence: 0.9, signals: ["@Configuration"] };
  },
  async collectEvidence() {
    return { "concept.01": [{ file: "A.java", lineStart: 1, lineEnd: 5, pattern: "@Configuration" }] };
  },
  async instantiateDAG() {
    return {
      packId: "mock-pack",
      repoContext: { repoName: "test", rootPath: "/tmp" },
      includedConcepts: [{ conceptId: "concept.01", evidenceScore: 1, evidenceEntries: [], inclusionReason: "required" as const }],
      excludedConcepts: [],
      conceptOrder: ["concept.01"],
    };
  },
  async buildSessions() {
    return [{
      id: "concept.01",
      conceptId: "concept.01",
      title: "Test Session",
      learningGoals: ["Learn something"],
      explanationOutline: [],
      evidence: [],
      unlockRule: { prerequisites: [], requireExercise: false, requireQuiz: false },
    }];
  },
  async buildExerciseSpec() { return null; },
  async buildQuizSpec() { return null; },
  async evaluateSubmission() {
    return { passed: true, score: 100, rubric: [], feedback: ["OK"], nextAction: "advance" as const };
  },
};

describe("Orchestrator", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "orchestrator-test-"));
    writeFileSync(join(tempDir, "pom.xml"), "<project/>");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("run produces fresh plan with artifacts", async () => {
    const orch = new Orchestrator();
    orch.registerAdapter(mockAdapter);
    orch.registerPack(mockPack);

    const result = await orch.run({ rootPath: tempDir, repoName: "test" });

    expect(result.planStatus).toBe("fresh");
    expect(result.sessionCount).toBe(1);
    expect(existsSync(join(tempDir, ".study-agent", "sessions.json"))).toBe(true);
    expect(existsSync(join(tempDir, ".study-agent", "progress.json"))).toBe(true);
    expect(existsSync(join(tempDir, ".study-agent", "instantiated-dag.json"))).toBe(true);
  });

  it("run returns reused on second call", async () => {
    const orch = new Orchestrator();
    orch.registerAdapter(mockAdapter);
    orch.registerPack(mockPack);

    await orch.run({ rootPath: tempDir, repoName: "test" });
    const result = await orch.run({ rootPath: tempDir, repoName: "test" });

    expect(result.planStatus).toBe("reused");
  });

  it("run with force regenerates plan", async () => {
    const orch = new Orchestrator();
    orch.registerAdapter(mockAdapter);
    orch.registerPack(mockPack);

    await orch.run({ rootPath: tempDir, repoName: "test" });
    const result = await orch.run({ rootPath: tempDir, repoName: "test" }, { force: true });

    expect(result.planStatus).toBe("fresh");
  });
});
