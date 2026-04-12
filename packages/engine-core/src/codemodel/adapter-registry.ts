import type { LanguageAdapter, RepoContext, LanguageDetectResult, CodeModelResult } from "../domain/types.js";

export class AdapterRegistry {
  private adapters: LanguageAdapter[] = [];

  register(adapter: LanguageAdapter): void {
    this.adapters.push(adapter);
  }

  async detectLanguage(repo: RepoContext): Promise<{ adapter: LanguageAdapter; result: LanguageDetectResult } | null> {
    for (const adapter of this.adapters) {
      const result = await adapter.detect(repo);
      if (result && result.confidence > 0.5) {
        return { adapter, result };
      }
    }
    return null;
  }

  async buildCodeModel(adapter: LanguageAdapter, repo: RepoContext): Promise<CodeModelResult> {
    return adapter.buildCodeModel({ repo });
  }
}
