export interface EngineResponseSuccess<T> {
  ok: true;
  command: string;
  schemaVersion: string;
  repoRoot: string;
  packId?: string;
  data: T;
  warnings?: string[];
  artifactsPath?: string;
}

export interface EngineResponseError {
  ok: false;
  command: string;
  schemaVersion: string;
  repoRoot: string;
  error: { code: string; message: string };
  warnings?: string[];
}

export type EngineResponse<T> = EngineResponseSuccess<T> | EngineResponseError;

export const SCHEMA_VERSION = "0.1";

export function success<T>(
  command: string,
  repoRoot: string,
  data: T,
  opts?: { packId?: string; warnings?: string[]; artifactsPath?: string },
): EngineResponseSuccess<T> {
  return {
    ok: true,
    command,
    schemaVersion: SCHEMA_VERSION,
    repoRoot,
    data,
    ...opts,
  };
}

export function failure(
  command: string,
  repoRoot: string,
  code: string,
  message: string,
  warnings?: string[],
): EngineResponseError {
  return {
    ok: false,
    command,
    schemaVersion: SCHEMA_VERSION,
    repoRoot,
    error: { code, message },
    warnings,
  };
}
