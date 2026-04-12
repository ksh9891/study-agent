import type { StudyPack, ExtensionManifest, PackRequirements } from "@study-agent/engine-core";
import { detectSpringCore } from "./detector.js";
import { collectSpringEvidence } from "./evidence-collector.js";
import { instantiateSpringDAG } from "./dag-instantiator.js";
import { buildSpringSessions } from "./session-builder.js";
import { buildSpringExerciseSpec } from "./exercise-builder.js";
import { buildSpringQuizSpec } from "./quiz-builder.js";
import { evaluateSpringSubmission } from "./evaluator.js";

const manifest: ExtensionManifest = {
  id: "@study-agent/pack-spring-core",
  name: "Spring Core Study Pack",
  version: "0.1.0",
  apiVersion: "0.1",
  kind: "study-pack",
  supports: ["java"],
};

const requirements: PackRequirements = {
  requiredCapabilities: {
    fileIndex: true,
    annotations: true,
    imports: true,
  },
  preferredCapabilities: {
    inheritance: true,
    dependencies: true,
  },
  degradationRules: [
    {
      capability: "inheritance",
      action: "reduce_evidence",
      message: "Inheritance-based evidence rules will be skipped",
    },
  ],
};

export const packSpringCore: StudyPack = {
  manifest,
  requirements,

  async detect(input) { return detectSpringCore(input); },
  async collectEvidence(input) { return collectSpringEvidence(input); },
  async instantiateDAG(input) {
    return instantiateSpringDAG({
      evidenceMap: input.evidenceMap,
      packId: manifest.id,
      repoName: "unknown",
      rootPath: "",
    });
  },
  async buildSessions(input) { return buildSpringSessions(input); },
  async buildExerciseSpec(input) { return buildSpringExerciseSpec(input); },
  async buildQuizSpec(input) { return buildSpringQuizSpec(input); },
  async evaluateSubmission(input) { return evaluateSpringSubmission(input); },
};
