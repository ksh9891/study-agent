import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildJavaCodeModel } from "../code-model-builder.js";

describe("buildJavaCodeModel", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "codemodel-test-"));
    mkdirSync(join(tempDir, "src/main/java/com/example"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("extracts files with annotations and imports", () => {
    writeFileSync(
      join(tempDir, "src/main/java/com/example/AppConfig.java"),
      `package com.example;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;

@Configuration
public class AppConfig {
    @Bean
    public GreetingService greetingService() {
        return new GreetingService();
    }
}`,
    );

    const result = buildJavaCodeModel({ rootPath: tempDir, repoName: "test" });

    expect(result.capabilities.fileIndex).toBe(true);
    expect(result.capabilities.annotations).toBe(true);
    expect(result.capabilities.imports).toBe(true);
    expect(result.capabilities.callGraph).toBe(false);

    expect(result.codeModel.files).toHaveLength(1);
    const file = result.codeModel.files[0];
    expect(file.annotations).toContain("@Configuration");
    expect(file.imports).toContain("org.springframework.context.annotation.Configuration");
    expect(file.imports).toContain("org.springframework.context.annotation.Bean");
    expect(file.packageName).toBe("com.example");
  });

  it("extracts class info with extends/implements", () => {
    writeFileSync(
      join(tempDir, "src/main/java/com/example/MyService.java"),
      `package com.example;

import org.springframework.stereotype.Service;

@Service
public class MyService implements Runnable {
    @Override
    public void run() {}
}`,
    );

    const result = buildJavaCodeModel({ rootPath: tempDir, repoName: "test" });
    const file = result.codeModel.files[0];
    expect(file.classes).toHaveLength(1);
    expect(file.classes![0].name).toBe("MyService");
    expect(file.classes![0].implements).toContain("Runnable");
    expect(file.classes![0].annotations).toContain("@Service");
  });

  it("returns empty model for empty repo", () => {
    const result = buildJavaCodeModel({ rootPath: tempDir, repoName: "test" });
    expect(result.codeModel.files).toHaveLength(0);
  });
});
