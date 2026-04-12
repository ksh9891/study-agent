import type {
  StudyPack, RepoContext, CodeModel, AdapterCapabilities,
  LanguageDetectResult, PackMatchResult,
} from "../domain/types.js";

export class PackRegistry {
  private packs: StudyPack[] = [];

  register(pack: StudyPack): void {
    this.packs.push(pack);
  }

  async selectBestPack(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    capabilities: AdapterCapabilities;
    language: LanguageDetectResult;
  }): Promise<{ pack: StudyPack; match: PackMatchResult } | null> {
    let bestPack: StudyPack | null = null;
    let bestMatch: PackMatchResult | null = null;

    for (const pack of this.packs) {
      const match = await pack.detect(input);
      if (match && (!bestMatch || match.score > bestMatch.score)) {
        bestPack = pack;
        bestMatch = match;
      }
    }

    if (bestPack && bestMatch) {
      return { pack: bestPack, match: bestMatch };
    }
    return null;
  }
}
