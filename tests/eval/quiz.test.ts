import { describe, it, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prepareFixture, type PreparedFixture } from "./helpers/run-fixture.js";
import { FIXTURES, AUTHORED_SESSIONS } from "./helpers/fixtures-list.js";
import { assertGoldenEquals } from "./helpers/golden-compare.js";

describe("quiz artifacts (C)", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      let prepared: PreparedFixture;
      beforeAll(async () => { prepared = await prepareFixture(fixture); });
      afterAll(() => { prepared?.dispose(); });

      for (const sessionId of AUTHORED_SESSIONS) {
        it(`${sessionId} quiz.json`, () => {
          const actualPath = join(prepared.repoDir, ".study-agent", "quiz", sessionId, "quiz.json");
          if (!existsSync(actualPath)) return;
          const actual = JSON.parse(readFileSync(actualPath, "utf-8"));
          const goldenPath = join(fixture.fixtureRoot, "expected", "quiz", sessionId, "quiz.json");
          assertGoldenEquals(actual, goldenPath, { repoRoot: prepared.repoDir });
        });
      }
    });
  }
});
