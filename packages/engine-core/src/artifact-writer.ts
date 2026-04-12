import { writeFileSync, mkdirSync, copyFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import type {
  InstantiatedDAG, StudySessionSpec, ExerciseSpecInternal,
  ExerciseSpecPublic, QuizSpecInternal, QuizSpecPublic, ProgressData, ConceptGraph,
} from "./domain/types.js";

export class ArtifactWriter {
  constructor(
    private publicDir: string,
    private internalDir: string,
  ) {}

  ensureDirs(): void {
    mkdirSync(this.publicDir, { recursive: true });
    mkdirSync(this.internalDir, { recursive: true });
  }

  writeAnalysis(data: Record<string, unknown>): void {
    this.writePublic("analysis.json", { schemaVersion: "0.1", ...data });
  }

  writeConceptGraph(dag: ConceptGraph): void {
    this.writePublic("concept-graph.json", { schemaVersion: "0.1", ...dag });
  }

  writeInstantiatedDAG(dag: InstantiatedDAG): void {
    this.writePublic("instantiated-dag.json", { schemaVersion: "0.1", ...dag });
  }

  writeSessions(sessions: StudySessionSpec[]): void {
    this.writePublic("sessions.json", { schemaVersion: "0.1", sessions });
  }

  writeProgress(progress: ProgressData): void {
    this.writePublic("progress.json", progress);
  }

  writeExerciseSpec(sessionId: string, spec: ExerciseSpecInternal): void {
    const pubSpec: ExerciseSpecPublic = {
      id: spec.id,
      sessionId: spec.sessionId,
      title: spec.title,
      prompt: spec.prompt,
      starterFiles: spec.starterFiles,
      expectedArtifacts: spec.expectedArtifacts,
      repoAnchors: spec.repoAnchors,
      hints: spec.hints,
    };
    const exerciseDir = join("exercises", sessionId);
    this.writePublic(join(exerciseDir, "exercise-spec.json"), { schemaVersion: "0.1", ...pubSpec });
    this.writeInternal(join(exerciseDir, "exercise-spec.internal.json"), { schemaVersion: "0.1", ...spec });
  }

  writeQuizSpec(sessionId: string, spec: QuizSpecInternal): void {
    const pubSpec: QuizSpecPublic = {
      id: spec.id,
      sessionId: spec.sessionId,
      gradedQuestions: spec.gradedQuestions,
      reflectionQuestions: spec.reflectionQuestions,
      passingScore: spec.passingScore,
    };
    const quizDir = join("quiz", sessionId);
    this.writePublic(join(quizDir, "quiz.json"), { schemaVersion: "0.1", ...pubSpec });
    this.writeInternal(join(quizDir, "quiz.internal.json"), { schemaVersion: "0.1", ...spec });
  }

  materializeStarterFiles(sessionId: string, spec: ExerciseSpecInternal): void {
    const starterSrcDir = join(spec.templateBundle, "starter");
    if (!existsSync(starterSrcDir)) return;
    const targetDir = join(this.publicDir, "exercises", sessionId, "starter");
    mkdirSync(targetDir, { recursive: true });

    for (const entry of readdirSync(starterSrcDir)) {
      const srcPath = join(starterSrcDir, entry);
      let content = readFileSync(srcPath, "utf-8");

      for (const [key, value] of Object.entries(spec.templateVariables)) {
        content = content.replaceAll(`{{${key}}}`, value);
      }

      const targetName = entry.replace(/\.tmpl$/, "");
      writeFileSync(join(targetDir, targetName), content);
    }
  }

  copyHiddenTests(sessionId: string, spec: ExerciseSpecInternal): void {
    const srcDir = join(spec.templateBundle, "hidden-tests");
    if (!existsSync(srcDir)) return;
    const targetDir = join(this.internalDir, "exercises", sessionId, "hidden-tests");
    mkdirSync(targetDir, { recursive: true });

    for (const entry of readdirSync(srcDir)) {
      copyFileSync(join(srcDir, entry), join(targetDir, entry));
    }
  }

  private writePublic(relPath: string, data: unknown): void {
    const fullPath = join(this.publicDir, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(data, null, 2));
  }

  private writeInternal(relPath: string, data: unknown): void {
    const fullPath = join(this.internalDir, relPath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, JSON.stringify(data, null, 2));
  }
}
