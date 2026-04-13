import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "./yaml-parser.js";
import type {
  RepoContext, CodeModel, StudySessionSpec,
  ExerciseSpecInternal, StarterFile, HiddenTestPlan, CodeEvidence,
} from "@study-agent/engine-core";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Probe src-relative path first (vitest), then dist-relative (compiled)
const srcRelative = join(__dirname, "../exercises");
const distRelative = join(__dirname, "../../exercises");
const EXERCISES_DIR = existsSync(srcRelative) ? srcRelative : distRelative;

const SESSION_TO_EXERCISE: Record<string, string> = {
  "spring.ioc.01": "di-01-ioc-bean-metadata",
  "spring.di.02": "di-02-bean-registration",
  "spring.di.03": "di-03-singleton-registry",
  "spring.di.04": "di-04-constructor-di",
};

export function buildSpringExerciseSpec(input: {
  repo: RepoContext;
  codeModel: CodeModel;
  session: StudySessionSpec;
}): ExerciseSpecInternal | null {
  const exerciseDir = SESSION_TO_EXERCISE[input.session.id];
  if (!exerciseDir) return null;

  const exercisePath = join(EXERCISES_DIR, exerciseDir);
  const yamlContent = readFileSync(join(exercisePath, "exercise.yaml"), "utf-8");
  const config = parseYaml(yamlContent);

  const templateVariables: Record<string, string> = {
    ...(config.templateVariables as Record<string, string> ?? {}),
    repoName: input.repo.repoName,
    sessionId: input.session.id,
  };

  const starterFiles: StarterFile[] = (config.starterFiles as Array<{ path: string; description: string }> ?? []).map(
    (sf) => ({
      path: sf.path,
      description: sf.description,
    }),
  );

  const hiddenTestFiles: Record<string, string[]> = {
    "di-01-ioc-bean-metadata": ["ContainerTest.java"],
    "di-02-bean-registration": ["RegistryTest.java"],
    "di-03-singleton-registry": ["SingletonRegistryTest.java"],
    "di-04-constructor-di": ["ConstructorResolverTest.java"],
  };

  return {
    id: config.id as string,
    sessionId: input.session.id,
    title: config.title as string,
    prompt: config.prompt as string,
    templateBundle: exercisePath,
    templateVariables,
    starterFiles,
    expectedArtifacts: config.expectedArtifacts as string[] ?? [],
    repoAnchors: input.session.evidence.slice(0, 3),
    hiddenTestPlan: {
      testFiles: hiddenTestFiles[exerciseDir] ?? [],
      runner: "javac+junit",
      command: "javac",
      args: [],
      timeout: 30_000,
    },
    hints: config.hints as string[] ?? [],
  };
}
