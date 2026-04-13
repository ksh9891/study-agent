import { describe, it, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prepareFixture, type PreparedFixture } from "./helpers/run-fixture.js";
import { FIXTURES } from "./helpers/fixtures-list.js";
import { assertGoldenEquals } from "./helpers/golden-compare.js";

const ARTIFACTS = ["analysis.json", "instantiated-dag.json", "sessions.json"] as const;

describe("planning artifacts (A)", () => {
  for (const fixture of FIXTURES) {
    describe(fixture.name, () => {
      let prepared: PreparedFixture;
      beforeAll(async () => { prepared = await prepareFixture(fixture); });
      afterAll(() => { prepared?.dispose(); });

      for (const artifact of ARTIFACTS) {
        it(artifact, () => {
          const actualPath = join(prepared.repoDir, ".study-agent", artifact);
          const actual = JSON.parse(readFileSync(actualPath, "utf-8"));
          const goldenPath = join(fixture.fixtureRoot, "expected", artifact);
          assertGoldenEquals(actual, goldenPath, { repoRoot: prepared.repoDir });
        });
      }
    });
  }
});
