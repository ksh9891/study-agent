import { existsSync } from "node:fs";
import { join } from "node:path";
import type { RepoContext, LanguageDetectResult } from "@study-agent/engine-core";

export function detectJava(repo: RepoContext): LanguageDetectResult | null {
  const hasPom = existsSync(join(repo.rootPath, "pom.xml"));
  const hasGradle = existsSync(join(repo.rootPath, "build.gradle"));
  const hasGradleKts = existsSync(join(repo.rootPath, "build.gradle.kts"));

  if (hasPom) {
    return { language: "java", confidence: 0.95, buildTool: "maven", buildFile: "pom.xml" };
  }
  if (hasGradle || hasGradleKts) {
    const buildFile = hasGradle ? "build.gradle" : "build.gradle.kts";
    return { language: "java", confidence: 0.95, buildTool: "gradle", buildFile };
  }
  return null;
}
