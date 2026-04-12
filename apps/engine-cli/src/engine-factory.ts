import { Orchestrator } from "@study-agent/engine-core";
import { adapterJava } from "@study-agent/adapter-java";
import { packSpringCore } from "@study-agent/pack-spring-core";

export function createEngine(): Orchestrator {
  const engine = new Orchestrator();
  engine.registerAdapter(adapterJava);
  engine.registerPack(packSpringCore);
  return engine;
}
