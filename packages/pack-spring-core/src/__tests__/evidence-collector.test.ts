import { describe, it, expect } from "vitest";
import { collectSpringEvidence } from "../evidence-collector.js";
import type { CodeModel, RepoContext } from "@study-agent/engine-core";

describe("collectSpringEvidence", () => {
  const repo: RepoContext = { rootPath: "/tmp", repoName: "test" };

  it("collects evidence for ioc.01 from @Configuration", () => {
    const codeModel: CodeModel = {
      language: "java",
      files: [
        {
          path: "config/AppConfig.java",
          annotations: ["@Configuration", "@Bean"],
          imports: ["org.springframework.context.annotation.Configuration", "org.springframework.context.annotation.Bean"],
          classes: [{ name: "AppConfig", kind: "class", annotations: ["@Configuration"] }],
        },
      ],
      symbols: [],
      references: [],
    };

    const evidenceMap = collectSpringEvidence({ repo, codeModel });

    expect(evidenceMap["spring.ioc.01"]).toBeDefined();
    expect(evidenceMap["spring.ioc.01"].length).toBeGreaterThan(0);
    expect(evidenceMap["spring.ioc.01"].some((e) => e.pattern === "@Configuration")).toBe(true);
  });

  it("returns empty arrays for concepts with no evidence", () => {
    const codeModel: CodeModel = {
      language: "java",
      files: [{ path: "Main.java", annotations: [], imports: [], classes: [] }],
      symbols: [],
      references: [],
    };

    const evidenceMap = collectSpringEvidence({ repo, codeModel });
    expect(evidenceMap["spring.aop.06"]).toEqual([]);
  });
});
