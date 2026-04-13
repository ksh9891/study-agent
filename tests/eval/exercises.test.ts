import { describe, it, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prepareFixture, type PreparedFixture } from "./helpers/run-fixture.js";
import { FIXTURES } from "./helpers/fixtures-list.js";
import { assertGoldenEquals, assertGoldenFileEquals } from "./helpers/golden-compare.js";

const AUTHORED_SESSIONS = ["spring.ioc.01", "spring.di.02"] as const;

describe("exercise artifacts (B)", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      let prepared: PreparedFixture;
      beforeAll(async () => { prepared = await prepareFixture(fixture); });
      afterAll(() => { prepared?.dispose(); });

      for (const sessionId of AUTHORED_SESSIONS) {
        describe(sessionId, () => {
          it("exercise-spec.json", () => {
            const actualDir = join(prepared.repoDir, ".study-agent", "exercises", sessionId);
            if (!existsSync(actualDir)) {
              return;
            }
            const actual = JSON.parse(readFileSync(join(actualDir, "exercise-spec.json"), "utf-8"));
            const goldenPath = join(fixture.fixtureRoot, "expected", "exercises", sessionId, "exercise-spec.json");
            assertGoldenEquals(actual, goldenPath, { repoRoot: prepared.repoDir });
          });

          it("starter files (raw text)", () => {
            const starterDir = join(prepared.repoDir, ".study-agent", "exercises", sessionId, "starter");
            if (!existsSync(starterDir)) return;
            const files = readdirSync(starterDir).sort();
            for (const f of files) {
              const actualPath = join(starterDir, f);
              const goldenPath = join(fixture.fixtureRoot, "expected", "exercises", sessionId, "starter", f);
              assertGoldenFileEquals(actualPath, goldenPath);
            }
          });
        });
      }
    });
  }
});
