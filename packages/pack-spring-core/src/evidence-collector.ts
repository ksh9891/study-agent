import type { RepoContext, CodeModel, EvidenceMap, EvidenceEntry } from "@study-agent/engine-core";
import { getCanonicalDAG } from "./canonical-dag.js";

export function collectSpringEvidence(input: {
  repo: RepoContext;
  codeModel: CodeModel;
}): EvidenceMap {
  const dag = getCanonicalDAG();
  const evidenceMap: EvidenceMap = {};

  for (const node of dag.nodes) {
    evidenceMap[node.id] = [];
  }

  for (const file of input.codeModel.files) {
    for (const node of dag.nodes) {
      for (const rule of node.evidenceRules) {
        const entries = matchRule(rule, file);
        evidenceMap[node.id].push(...entries);
      }
    }
  }

  return evidenceMap;
}

function matchRule(
  rule: { type: string; pattern: string },
  file: { path: string; annotations?: string[]; imports?: string[]; classes?: Array<{ implements?: string[] }> },
): EvidenceEntry[] {
  const entries: EvidenceEntry[] = [];

  if (rule.type === "annotation") {
    if (file.annotations?.includes(rule.pattern)) {
      entries.push({ file: file.path, lineStart: 0, lineEnd: 0, pattern: rule.pattern, ruleType: "annotation" });
    }
  }

  if (rule.type === "import") {
    for (const imp of file.imports ?? []) {
      if (imp.startsWith(rule.pattern)) {
        entries.push({ file: file.path, lineStart: 0, lineEnd: 0, pattern: imp, ruleType: "import" });
      }
    }
  }

  if (rule.type === "class_usage") {
    for (const imp of file.imports ?? []) {
      if (imp.endsWith(`.${rule.pattern}`) || imp === rule.pattern) {
        entries.push({ file: file.path, lineStart: 0, lineEnd: 0, pattern: rule.pattern, ruleType: "class_usage" });
      }
    }
  }

  if (rule.type === "inheritance") {
    for (const cls of file.classes ?? []) {
      if (cls.implements?.includes(rule.pattern)) {
        entries.push({ file: file.path, lineStart: 0, lineEnd: 0, pattern: rule.pattern, ruleType: "inheritance" });
      }
    }
  }

  return entries;
}
