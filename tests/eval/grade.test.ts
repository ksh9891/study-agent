import { describe, it, beforeAll, afterAll } from "vitest";
import { mkdirSync, cpSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import { gradeCommand } from "@study-agent/engine-cli";
import { prepareFixture, type PreparedFixture } from "./helpers/run-fixture.js";
import { FIXTURES } from "./helpers/fixtures-list.js";
import { assertGoldenEquals } from "./helpers/golden-compare.js";

const AUTHORED_SESSIONS = ["spring.ioc.01", "spring.di.02"] as const;

describe("grade outputs (D)", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      let prepared: PreparedFixture;
      beforeAll(async () => { prepared = await prepareFixture(fixture); });
      afterAll(() => { prepared?.dispose(); });

      for (const sessionId of AUTHORED_SESSIONS) {
        describe(sessionId, () => {
          it("pass case", async () => {
            const submissionDir = join(fixture.fixtureRoot, "golden-submissions", sessionId);
            if (!existsSync(submissionDir)) return;
            const raw = await gradeCommand(prepared.repoDir, sessionId, submissionDir);
            const parsed = JSON.parse(raw);
            const goldenPath = join(fixture.fixtureRoot, "expected", "grade", `${sessionId}.passed.json`);
            assertGoldenEquals(parsed.data, goldenPath, { repoRoot: prepared.repoDir });
          });

          it("fail case (missing file)", async () => {
            const submissionSource = join(fixture.fixtureRoot, "golden-submissions", sessionId);
            if (!existsSync(submissionSource)) return;

            const tempSub = mkdtempSync(join(tmpdir(), `grade-fail-${sessionId}-`));
            try {
              const all = readdirSync(submissionSource);
              // Copy all but the first file to simulate missing artifact
              for (const f of all.slice(1)) {
                cpSync(join(submissionSource, f), join(tempSub, f), { recursive: true });
              }
              const raw = await gradeCommand(prepared.repoDir, sessionId, tempSub);
              const parsed = JSON.parse(raw);
              const goldenPath = join(fixture.fixtureRoot, "expected", "grade", `${sessionId}.failing.json`);
              assertGoldenEquals(parsed.data, goldenPath, { repoRoot: prepared.repoDir });
            } finally {
              rmSync(tempSub, { recursive: true, force: true });
            }
          });
        });
      }
    });
  }
});
