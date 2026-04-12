import { resolve } from "node:path";

export function resolveRepoPath(input: string): string {
  if (input === ".") return process.cwd();
  return resolve(input);
}
