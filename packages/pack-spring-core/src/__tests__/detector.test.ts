import { describe, it, expect } from "vitest";
import { detectSpringCore } from "../detector.js";
import type { CodeModel, AdapterCapabilities, LanguageDetectResult, RepoContext } from "@study-agent/engine-core";

const defaultCaps: AdapterCapabilities = {
  fileIndex: true, dependencies: true, annotations: true,
  imports: true, inheritance: true, shallowSymbols: false,
  references: false, callGraph: false,
};

const javaLang: LanguageDetectResult = { language: "java", confidence: 0.95, buildTool: "maven" };

describe("detectSpringCore", () => {
  it("matches when Spring annotations are present", () => {
    const codeModel: CodeModel = {
      language: "java",
      files: [
        { path: "AppConfig.java", annotations: ["@Configuration", "@Bean"], imports: ["org.springframework.context.annotation.Configuration"], classes: [] },
      ],
      symbols: [],
      references: [],
    };
    const result = detectSpringCore({
      repo: { rootPath: "/tmp", repoName: "test" },
      codeModel,
      capabilities: defaultCaps,
      language: javaLang,
    });
    expect(result).not.toBeNull();
    expect(result!.packId).toBe("@study-agent/pack-spring-core");
    expect(result!.score).toBeGreaterThan(0);
  });

  it("returns null for non-Spring project", () => {
    const codeModel: CodeModel = {
      language: "java",
      files: [{ path: "Main.java", annotations: [], imports: [], classes: [] }],
      symbols: [],
      references: [],
    };
    const result = detectSpringCore({
      repo: { rootPath: "/tmp", repoName: "test" },
      codeModel,
      capabilities: defaultCaps,
      language: javaLang,
    });
    expect(result).toBeNull();
  });
});
