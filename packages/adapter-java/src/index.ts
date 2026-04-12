import type { LanguageAdapter, ExtensionManifest } from "@study-agent/engine-core";
import { detectJava } from "./detector.js";
import { buildJavaCodeModel } from "./code-model-builder.js";
import { resolveTestStrategy } from "./test-strategy-resolver.js";

const manifest: ExtensionManifest = {
  id: "@study-agent/adapter-java",
  name: "Java Language Adapter",
  version: "0.1.0",
  apiVersion: "0.1",
  kind: "language-adapter",
  supports: ["java"],
};

export const adapterJava: LanguageAdapter = {
  manifest,
  async detect(repo) { return detectJava(repo); },
  async buildCodeModel({ repo }) { return buildJavaCodeModel(repo); },
  async getTestStrategy({ repo }) { return resolveTestStrategy(repo); },
};
