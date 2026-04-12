import type {
  RepoContext, LanguageAdapter, StudyPack,
  StudySessionSpec, ExerciseSpecInternal, QuizSpecInternal,
  ProgressData, ConceptGraph,
} from "./domain/types.js";
import { AdapterRegistry } from "./codemodel/adapter-registry.js";
import { PackRegistry } from "./planning/pack-registry.js";
import { ArtifactWriter } from "./artifact-writer.js";
import { ProgressStore } from "./progress/progress-store.js";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

export interface RunResult {
  planStatus: "fresh" | "reused" | "stale";
  packId: string;
  sessionCount: number;
  sessions: StudySessionSpec[];
  progress: ProgressData;
}

export class Orchestrator {
  private adapterRegistry = new AdapterRegistry();
  private packRegistry = new PackRegistry();

  registerAdapter(adapter: LanguageAdapter): void {
    this.adapterRegistry.register(adapter);
  }

  registerPack(pack: StudyPack): void {
    this.packRegistry.register(pack);
  }

  async run(repo: RepoContext, opts?: { force?: boolean }): Promise<RunResult> {
    const publicDir = join(repo.rootPath, ".study-agent");
    const internalDir = join(repo.rootPath, ".study-agent-internal");
    const writer = new ArtifactWriter(publicDir, internalDir);
    const progressStore = new ProgressStore(publicDir);

    // Check for existing plan
    const sessionsPath = join(publicDir, "sessions.json");
    if (!opts?.force && existsSync(sessionsPath)) {
      const existing = JSON.parse(readFileSync(sessionsPath, "utf-8"));
      const progress = progressStore.load();
      if (progress) {
        // Detect stale: rebuild sessions and compare IDs
        const langResult = await this.adapterRegistry.detectLanguage(repo);
        if (langResult) {
          const codeModelResult = await this.adapterRegistry.buildCodeModel(langResult.adapter, repo);
          const packResult = await this.packRegistry.selectBestPack({
            repo,
            codeModel: codeModelResult.codeModel,
            capabilities: codeModelResult.capabilities,
            language: langResult.result,
          });
          if (packResult) {
            const evidenceMap = await packResult.pack.collectEvidence({ repo, codeModel: codeModelResult.codeModel });
            const dag = await packResult.pack.instantiateDAG({ evidenceMap });
            const existingIds = (existing.sessions as StudySessionSpec[]).map((s) => s.id);
            const currentIds = dag.conceptOrder;
            const isStale = existingIds.length !== currentIds.length || existingIds.some((id, i) => id !== currentIds[i]);

            if (isStale) {
              return {
                planStatus: "stale",
                packId: progress.packId,
                sessionCount: existing.sessions.length,
                sessions: existing.sessions,
                progress,
              };
            }
          }
        }

        return {
          planStatus: "reused",
          packId: progress.packId,
          sessionCount: existing.sessions.length,
          sessions: existing.sessions,
          progress,
        };
      }
      // progress.json missing (interrupted run) — fall through to regenerate
    }

    writer.ensureDirs();

    // Step 1: Detect language
    const langResult = await this.adapterRegistry.detectLanguage(repo);
    if (!langResult) throw new Error("ADAPTER_NOT_FOUND");

    // Step 2: Build CodeModel
    const codeModelResult = await this.adapterRegistry.buildCodeModel(langResult.adapter, repo);

    // Step 3: Select pack
    const packResult = await this.packRegistry.selectBestPack({
      repo,
      codeModel: codeModelResult.codeModel,
      capabilities: codeModelResult.capabilities,
      language: langResult.result,
    });
    if (!packResult) throw new Error("PACK_NOT_FOUND");

    const { pack, match } = packResult;

    // Step 4: Collect evidence
    const evidenceMap = await pack.collectEvidence({
      repo,
      codeModel: codeModelResult.codeModel,
    });

    // Step 5: Instantiate DAG
    const instantiatedDAG = await pack.instantiateDAG({ evidenceMap });
    // Patch repoContext since the pack interface doesn't receive it
    instantiatedDAG.repoContext = { repoName: repo.repoName, rootPath: repo.rootPath };

    // Step 6: Build sessions
    const sessions = await pack.buildSessions({
      repo,
      codeModel: codeModelResult.codeModel,
      instantiatedDAG,
    });

    // Step 7: Write artifacts
    writer.writeAnalysis({
      adapterId: langResult.adapter.manifest.id,
      language: langResult.result,
      capabilities: codeModelResult.capabilities,
      matchedPack: match,
    });
    writer.writeInstantiatedDAG(instantiatedDAG);
    writer.writeSessions(sessions);

    // Step 8: Build and write exercise/quiz specs for available sessions
    for (const session of sessions) {
      const exerciseSpec = await pack.buildExerciseSpec({
        repo,
        codeModel: codeModelResult.codeModel,
        session,
      });
      if (exerciseSpec) {
        writer.writeExerciseSpec(session.id, exerciseSpec);
        writer.materializeStarterFiles(session.id, exerciseSpec);
        writer.copyHiddenTests(session.id, exerciseSpec);
      }

      const quizSpec = await pack.buildQuizSpec({ session, exercise: exerciseSpec });
      if (quizSpec) {
        writer.writeQuizSpec(session.id, quizSpec);
      }
    }

    // Step 9: Initialize progress
    const progress = progressStore.initialize(repo.repoName, pack.manifest.id, sessions);

    return {
      planStatus: "fresh",
      packId: pack.manifest.id,
      sessionCount: sessions.length,
      sessions,
      progress,
    };
  }
}
