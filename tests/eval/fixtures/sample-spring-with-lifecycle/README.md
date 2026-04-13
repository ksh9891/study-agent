# sample-spring-with-lifecycle fixture

**Intent:** Optional concept inclusion path coverage — a Spring project with `@PostConstruct`, `@PreDestroy`, and `BeanPostProcessor` evidence so `spring.lifecycle.05` crosses the evidence threshold and lands in `instantiatedDAG.includedConcepts`. `spring.aop.06` stays excluded (no AOP evidence here).

**Contents:**
- `pom.xml`, `src/main/java/com/example/*.java` — minimal Spring sources authored for this fixture. The engine consumes these.
- `golden-submissions/<sessionId>/` — expected artifact files for `gradeCommand`. Regenerate with `scripts/materialize-golden-submissions.mjs`.
- `expected/` — golden snapshots. Regenerate with `UPDATE_GOLDEN=1 pnpm test:eval`.

**Intended-current-state notes:**
- `instantiated-dag.json` MUST include `spring.lifecycle.05` in `includedConcepts`.
- `instantiated-dag.json` MUST exclude `spring.aop.06` in `excludedConcepts`.
- `sessions.json` may NOT contain a session for `spring.lifecycle.05` until Slice 3b authors it. The current "DAG included but session absent" state is intentional and captured in golden.
- When Slice 3b adds a lifecycle session, re-run `UPDATE_GOLDEN=1 pnpm test:eval` and verify the diff shows an ADDED session entry (not a replaced one).

**When to update:** same rules as `sample-spring-core/README.md`.
