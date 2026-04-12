import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConceptGraph } from "@study-agent/engine-core";

const __dirname = dirname(fileURLToPath(import.meta.url));

let cached: ConceptGraph | null = null;

export function getCanonicalDAG(): ConceptGraph {
  if (cached) return cached;
  // Try src-relative path first (vitest), then dist-relative path (compiled)
  const srcRelative = join(__dirname, "../concept-dag/spring-core-dag.json");
  const distRelative = join(__dirname, "../../concept-dag/spring-core-dag.json");
  const dagPath = existsSync(srcRelative) ? srcRelative : distRelative;
  const raw = readFileSync(dagPath, "utf-8");
  const parsed = JSON.parse(raw);
  cached = { nodes: parsed.nodes, edges: parsed.edges };
  return cached;
}
