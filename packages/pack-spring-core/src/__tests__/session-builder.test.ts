import { describe, it, expect } from "vitest";
import { buildSpringSessions } from "../session-builder.js";
import type { InstantiatedDAG, CodeModel, RepoContext } from "@study-agent/engine-core";

describe("buildSpringSessions", () => {
  const repo: RepoContext = { rootPath: "/tmp/repo", repoName: "test" };
  const codeModel: CodeModel = {
    language: "java",
    files: [
      {
        path: "config/AppConfig.java",
        annotations: ["@Configuration", "@Bean"],
        imports: ["org.springframework.context.annotation.Configuration"],
        classes: [{ name: "AppConfig", kind: "class" }],
      },
    ],
    symbols: [],
    references: [],
  };

  it("builds sessions for included concepts in order", () => {
    const dag: InstantiatedDAG = {
      packId: "@study-agent/pack-spring-core",
      repoContext: { repoName: "test", rootPath: "/tmp" },
      includedConcepts: [
        { conceptId: "spring.ioc.01", evidenceScore: 3, evidenceEntries: [], inclusionReason: "required" },
        { conceptId: "spring.di.02", evidenceScore: 1, evidenceEntries: [], inclusionReason: "required" },
      ],
      excludedConcepts: [],
      conceptOrder: ["spring.ioc.01", "spring.di.02"],
    };

    const sessions = buildSpringSessions({ repo, codeModel, instantiatedDAG: dag });

    expect(sessions).toHaveLength(2);
    expect(sessions[0].id).toBe("spring.ioc.01");
    expect(sessions[0].conceptId).toBe("spring.ioc.01");
    expect(sessions[0].learningGoals.length).toBeGreaterThan(0);
    expect(sessions[0].unlockRule).toBeDefined();
    expect(sessions[1].prerequisites).toContain("spring.ioc.01");
  });
});
