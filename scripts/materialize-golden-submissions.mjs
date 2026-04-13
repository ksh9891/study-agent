/**
 * Materialize golden-submissions for eval fixtures.
 *
 * Usage: node scripts/materialize-golden-submissions.mjs
 *
 * Runs the Orchestrator against example projects, then copies the
 * materialized starter files into the fixture golden-submissions dirs.
 */
import { Orchestrator } from "../packages/engine-core/dist/index.js";
import { adapterJava } from "../packages/adapter-java/dist/index.js";
import { packSpringCore } from "../packages/pack-spring-core/dist/index.js";
import { cpSync, mkdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");

function createFixtureCopy(fixtureDir) {
  const tempDir = mkdtempSync(join(tmpdir(), "study-agent-materialize-"));
  cpSync(fixtureDir, tempDir, { recursive: true });
  return tempDir;
}

const FIXTURES = [
  {
    name: "sample-spring-core",
    source: join(REPO, "examples", "sample-spring-project"),
    target: join(REPO, "tests", "eval", "fixtures", "sample-spring-core", "golden-submissions"),
    sessions: ["spring.ioc.01", "spring.di.02"],
  },
];

for (const f of FIXTURES) {
  const dir = createFixtureCopy(f.source);
  try {
    const engine = new Orchestrator();
    engine.registerAdapter(adapterJava);
    engine.registerPack(packSpringCore);
    await engine.run({ rootPath: dir, repoName: f.name });

    for (const s of f.sessions) {
      const starter = join(dir, ".study-agent", "exercises", s, "starter");
      if (!existsSync(starter)) {
        console.warn(`skip ${s}: not materialized`);
        continue;
      }
      const out = join(f.target, s);
      mkdirSync(out, { recursive: true });
      cpSync(starter, out, { recursive: true });
      console.log(`materialized ${f.name}/${s} -> ${out}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
