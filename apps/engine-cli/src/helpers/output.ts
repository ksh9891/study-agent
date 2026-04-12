import { success, failure } from "@study-agent/engine-core";

export function formatSuccess<T>(
  command: string,
  repoRoot: string,
  data: T,
  opts?: { packId?: string; warnings?: string[]; artifactsPath?: string },
): string {
  return JSON.stringify(success(command, repoRoot, data, opts), null, 2);
}

export function formatError(
  command: string,
  repoRoot: string,
  code: string,
  message: string,
  warnings?: string[],
): string {
  return JSON.stringify(failure(command, repoRoot, code, message, warnings), null, 2);
}
