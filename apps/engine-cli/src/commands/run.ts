import { createEngine } from "../engine-factory.js";
import { formatSuccess, formatError } from "../helpers/output.js";

export async function runCommand(repoPath: string, opts?: { force?: boolean }): Promise<string> {
  try {
    const engine = createEngine();
    const result = await engine.run({ rootPath: repoPath, repoName: repoPath.split("/").pop()! }, opts);
    return formatSuccess("run", repoPath, result, {
      packId: result.packId,
      artifactsPath: `${repoPath}/.study-agent`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return formatError("run", repoPath, message, `Run failed: ${message}`);
  }
}
