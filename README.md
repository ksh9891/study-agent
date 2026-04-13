# study-supporter

## Running tests

- `pnpm test` — unit + integration tests (fast, default).
- `pnpm test:eval` — golden-file regression harness against fixtures in `tests/eval/fixtures/`.
- `pnpm test:all` — both.

### Updating golden files

When intentional pack/engine/adapter changes alter public artifacts:

```bash
UPDATE_GOLDEN=1 pnpm test:eval
```

Review the diff in `tests/eval/fixtures/<fixture>/expected/` before committing. See each fixture's README for intent and update notes.
