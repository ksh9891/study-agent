# sample-spring-core fixture

**Intent:** Core path coverage -- evidence for required concepts only (`spring.ioc.01`, `spring.di.02`). Optional concepts (`spring.lifecycle.05`, `spring.aop.06`) should be absent from `includedConcepts`.

**Source:** Reuses `examples/sample-spring-project/` as the Spring project source. This directory only holds golden files and expected submissions, not source code.

**Contents:**
- `golden-submissions/<sessionId>/` -- expected artifact files used as input to `gradeCommand`. These are the materialized starter files that satisfy `expectedArtifacts` for each authored session. Regenerate with `scripts/materialize-golden-submissions.mjs` after authoring changes.
- `expected/` -- golden snapshots produced by eval tests. Regenerate with `UPDATE_GOLDEN=1 pnpm test:eval`.

**When to update:**
- Pack/engine/adapter changes that intentionally alter public artifacts: re-run `UPDATE_GOLDEN=1 pnpm test:eval` and review the diff.
- New authored session: add session id to `AUTHORED_SESSIONS` in `tests/eval/*.test.ts`, run the materialize script, then `UPDATE_GOLDEN=1 pnpm test:eval`.
- Template changes inside exercise bundles: regenerate via UPDATE_GOLDEN; the diff in `starter/` shows the textual change.

**Do NOT edit golden files by hand** -- always regenerate through the harness so normalizer is applied consistently.
