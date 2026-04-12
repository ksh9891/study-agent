import type {
  RepoContext, CodeModel, AdapterCapabilities,
  LanguageDetectResult, PackMatchResult,
} from "@study-agent/engine-core";

const SPRING_SIGNALS = [
  "@Configuration", "@Bean", "@Component", "@Service", "@Controller",
  "@RestController", "@SpringBootApplication", "@Autowired", "@ComponentScan",
];

const SPRING_IMPORTS = [
  "org.springframework.context",
  "org.springframework.beans",
  "org.springframework.boot",
  "org.springframework.stereotype",
];

export function detectSpringCore(input: {
  repo: RepoContext;
  codeModel: CodeModel;
  capabilities: AdapterCapabilities;
  language: LanguageDetectResult;
}): PackMatchResult | null {
  if (input.language.language !== "java") return null;

  const signals: string[] = [];
  let score = 0;

  for (const file of input.codeModel.files) {
    for (const ann of file.annotations ?? []) {
      if (SPRING_SIGNALS.includes(ann)) {
        signals.push(`${ann} in ${file.path}`);
        score += 1;
      }
    }
    for (const imp of file.imports ?? []) {
      if (SPRING_IMPORTS.some((prefix) => imp.startsWith(prefix))) {
        signals.push(`import ${imp} in ${file.path}`);
        score += 0.5;
      }
    }
  }

  if (score < 1) return null;

  return {
    packId: "@study-agent/pack-spring-core",
    score: Math.min(score / 10, 1),
    confidence: Math.min(score / 5, 1),
    signals,
  };
}
