import type {
  EvidenceMap, InstantiatedDAG, InstantiatedConcept, ExcludedConcept,
} from "@study-agent/engine-core";
import { getCanonicalDAG } from "./canonical-dag.js";

const OPTIONAL_EVIDENCE_THRESHOLD = 1;

export function instantiateSpringDAG(input: {
  evidenceMap: EvidenceMap;
  packId: string;
  repoName: string;
  rootPath: string;
}): InstantiatedDAG {
  const dag = getCanonicalDAG();
  const included: InstantiatedConcept[] = [];
  const excluded: ExcludedConcept[] = [];
  const includedIds = new Set<string>();

  for (const node of dag.nodes) {
    const entries = input.evidenceMap[node.id] ?? [];
    const score = entries.length;

    if (node.inclusionPolicy === "required") {
      included.push({
        conceptId: node.id,
        evidenceScore: score,
        evidenceEntries: entries,
        inclusionReason: "required",
      });
      includedIds.add(node.id);
    } else if (score >= OPTIONAL_EVIDENCE_THRESHOLD) {
      included.push({
        conceptId: node.id,
        evidenceScore: score,
        evidenceEntries: entries,
        inclusionReason: "evidence_threshold_met",
      });
      includedIds.add(node.id);
    } else {
      excluded.push({
        conceptId: node.id,
        evidenceScore: score,
        exclusionReason: "below_threshold",
      });
    }
  }

  const conceptOrder = topologicalSort(includedIds, dag.edges);

  return {
    packId: input.packId,
    repoContext: { repoName: input.repoName, rootPath: input.rootPath },
    includedConcepts: included,
    excludedConcepts: excluded,
    conceptOrder,
  };
}

function topologicalSort(
  includedIds: Set<string>,
  edges: Array<{ from: string; to: string }>,
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of includedIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of edges) {
    if (includedIds.has(edge.from) && includedIds.has(edge.to)) {
      adj.get(edge.from)!.push(edge.to);
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  queue.sort();

  const result: string[] = [];
  while (queue.length > 0) {
    queue.sort();
    const current = queue.shift()!;
    result.push(current);

    for (const next of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  return result;
}
