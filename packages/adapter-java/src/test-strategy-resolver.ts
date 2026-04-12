import { existsSync } from "node:fs";
import { join } from "node:path";
import type { RepoContext, TestStrategy } from "@study-agent/engine-core";

export function resolveTestStrategy(repo: RepoContext): TestStrategy {
  const hasGradlew = existsSync(join(repo.rootPath, "gradlew"));
  const hasGradle = existsSync(join(repo.rootPath, "build.gradle")) ||
    existsSync(join(repo.rootPath, "build.gradle.kts"));
  const hasMaven = existsSync(join(repo.rootPath, "pom.xml"));

  if (hasGradlew) {
    return { runner: "gradle", command: "./gradlew", args: ["test"], workingDir: repo.rootPath, timeout: 120_000 };
  }
  if (hasGradle) {
    return { runner: "gradle", command: "gradle", args: ["test"], workingDir: repo.rootPath, timeout: 120_000 };
  }
  if (hasMaven) {
    return { runner: "maven", command: "mvn", args: ["test", "-q"], workingDir: repo.rootPath, timeout: 120_000 };
  }
  return { runner: "custom", command: "echo", args: ["no test runner found"], workingDir: repo.rootPath };
}
