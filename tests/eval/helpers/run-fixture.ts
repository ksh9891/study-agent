import { Orchestrator } from "@study-agent/engine-core";
import { adapterJava } from "@study-agent/adapter-java";
import { packSpringCore } from "@study-agent/pack-spring-core";
import { createFixtureCopy, cleanupFixture } from "../../helpers/fixture-copy.js";
import type { FixtureDef } from "./fixtures-list.js";

export interface PreparedFixture {
  repoDir: string;
  fixture: FixtureDef;
  dispose: () => void;
}

export async function prepareFixture(fixture: FixtureDef): Promise<PreparedFixture> {
  const repoDir = createFixtureCopy(fixture.sourceDir);
  const engine = new Orchestrator();
  engine.registerAdapter(adapterJava);
  engine.registerPack(packSpringCore);
  await engine.run({ rootPath: repoDir, repoName: fixture.name });
  return { repoDir, fixture, dispose: () => cleanupFixture(repoDir) };
}
