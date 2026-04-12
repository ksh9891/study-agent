import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectJava } from "../detector.js";

describe("detectJava", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "adapter-java-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("detects Maven project by pom.xml", () => {
    writeFileSync(join(tempDir, "pom.xml"), "<project></project>");
    const result = detectJava({ rootPath: tempDir, repoName: "test" });
    expect(result).not.toBeNull();
    expect(result!.language).toBe("java");
    expect(result!.buildTool).toBe("maven");
  });

  it("detects Gradle project by build.gradle", () => {
    writeFileSync(join(tempDir, "build.gradle"), "plugins {}");
    const result = detectJava({ rootPath: tempDir, repoName: "test" });
    expect(result).not.toBeNull();
    expect(result!.buildTool).toBe("gradle");
  });

  it("detects Gradle Kotlin project by build.gradle.kts", () => {
    writeFileSync(join(tempDir, "build.gradle.kts"), "plugins {}");
    const result = detectJava({ rootPath: tempDir, repoName: "test" });
    expect(result).not.toBeNull();
    expect(result!.buildTool).toBe("gradle");
  });

  it("returns null for non-Java project", () => {
    writeFileSync(join(tempDir, "package.json"), "{}");
    const result = detectJava({ rootPath: tempDir, repoName: "test" });
    expect(result).toBeNull();
  });
});
