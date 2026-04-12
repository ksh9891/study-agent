import { mkdtempSync, cpSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function createFixtureCopy(fixtureDir: string): string {
  const tempDir = mkdtempSync(join(tmpdir(), "study-agent-integration-"));
  cpSync(fixtureDir, tempDir, { recursive: true });
  return tempDir;
}

export function cleanupFixture(tempDir: string): void {
  rmSync(tempDir, { recursive: true, force: true });
}
