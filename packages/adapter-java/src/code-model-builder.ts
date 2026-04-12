import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type {
  RepoContext,
  CodeModelResult,
  CodeFile,
  ClassInfo,
  AdapterCapabilities,
} from "@study-agent/engine-core";

const MVP_CAPABILITIES: AdapterCapabilities = {
  fileIndex: true,
  dependencies: true,
  annotations: true,
  imports: true,
  inheritance: true,
  shallowSymbols: false,
  references: false,
  callGraph: false,
};

export function buildJavaCodeModel(repo: RepoContext): CodeModelResult {
  const javaFiles = findJavaFiles(repo.rootPath);
  const codeFiles: CodeFile[] = javaFiles.map((absPath) => parseJavaFile(absPath, repo.rootPath));

  return {
    codeModel: {
      language: "java",
      files: codeFiles,
      symbols: [],
      references: [],
    },
    capabilities: MVP_CAPABILITIES,
  };
}

function findJavaFiles(dir: string): string[] {
  const results: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (entry === "node_modules" || entry === ".git" || entry === "build" || entry === "target") continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith(".java")) results.push(full);
    }
  };
  walk(dir);
  return results;
}

function parseJavaFile(absPath: string, rootPath: string): CodeFile {
  const content = readFileSync(absPath, "utf-8");
  const lines = content.split("\n");
  const relPath = relative(rootPath, absPath);

  const packageMatch = content.match(/^package\s+([\w.]+)\s*;/m);
  const packageName = packageMatch ? packageMatch[1] : undefined;

  const imports: string[] = [];
  const fileAnnotations: string[] = [];
  const classes: ClassInfo[] = [];

  for (const line of lines) {
    const importMatch = line.match(/^import\s+([\w.]+)\s*;/);
    if (importMatch) imports.push(importMatch[1]);

    const annotationMatch = line.match(/^@(\w+)/);
    if (annotationMatch) fileAnnotations.push(`@${annotationMatch[1]}`);
  }

  // Simple class/interface extraction via regex
  const classRegex = /(?:@(\w+)\s+)*(?:public\s+)?(?:abstract\s+)?(class|interface|enum)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/g;
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const kind = match[2] as "class" | "interface" | "enum";
    const name = match[3];
    const extendsName = match[4];
    const implementsRaw = match[5];
    const implementsList = implementsRaw
      ? implementsRaw.split(",").map((s) => s.trim())
      : undefined;

    // Collect annotations from the matched text (they appear before the class/interface/enum keyword)
    const classAnnotations: string[] = [];
    const matchText = match[0];
    const classKeywordIdx = matchText.search(/(class|interface|enum)\s+/);
    const beforeKeyword = matchText.substring(0, classKeywordIdx);
    const annotInMatchRegex = /@(\w+)/g;
    let am;
    while ((am = annotInMatchRegex.exec(beforeKeyword)) !== null) {
      classAnnotations.push(`@${am[1]}`);
    }

    classes.push({
      name,
      kind,
      extends: extendsName,
      implements: implementsList,
      annotations: classAnnotations.length > 0 ? classAnnotations : undefined,
    });
  }

  return {
    path: relPath,
    language: "java",
    packageName,
    imports,
    annotations: [...new Set(fileAnnotations)],
    classes,
  };
}
