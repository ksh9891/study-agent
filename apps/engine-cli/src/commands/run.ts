import { formatSuccess } from "../helpers/output.js";

export async function runCommand(repoPath: string): Promise<string> {
  return formatSuccess("run", repoPath, null);
}
