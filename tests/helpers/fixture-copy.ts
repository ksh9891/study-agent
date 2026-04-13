import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const EXCLUDED_DIRS = new Set([".study-agent", ".study-agent-internal"]);

export function createFixtureCopy(fixtureDir: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), "study-agent-integration-"));
  cpSync(fixtureDir, tempDir, {
    recursive: true,
    filter: (src) => {
      const base = src.split("/").pop() ?? "";
      return !EXCLUDED_DIRS.has(base);
    },
  });
  return tempDir;
}

export function cleanupFixture(tempDir: string): void {
  rmSync(tempDir, { recursive: true, force: true });
}
