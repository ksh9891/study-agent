import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface FixtureDef {
  name: string;
  sourceDir: string;   // absolute path to the Spring project source copied into temp
  fixtureRoot: string; // absolute path to tests/eval/fixtures/<name>/
}

const REPO_ROOT = join(__dirname, "..", "..", "..");

export const AUTHORED_SESSIONS = [
  "spring.ioc.01",
  "spring.di.02",
  "spring.di.03",
  "spring.di.04",
] as const;

export const FIXTURES: FixtureDef[] = [
  {
    name: "sample-spring-core",
    sourceDir: join(REPO_ROOT, "examples", "sample-spring-project"),
    fixtureRoot: join(REPO_ROOT, "tests", "eval", "fixtures", "sample-spring-core"),
  },
  {
    name: "sample-spring-with-lifecycle",
    sourceDir: join(REPO_ROOT, "tests", "eval", "fixtures", "sample-spring-with-lifecycle"),
    fixtureRoot: join(REPO_ROOT, "tests", "eval", "fixtures", "sample-spring-with-lifecycle"),
  },
];
