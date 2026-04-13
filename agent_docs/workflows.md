# Workflows

## Test layers

| 명령 | 용도 | 포함 범위 |
|---|---|---|
| `pnpm test` | 기본 dev loop. 빠름. | unit + integration (`tests/integration/**`) |
| `pnpm test:eval` | Golden-file regression harness | `tests/eval/**` (별도 vitest project) |
| `pnpm test:all` | `test` 후 `test:eval` 순차 실행 | 전부 |
| `pnpm build` | 패키지 빌드 (`pnpm -r build`) | 전체 workspace |

CI는 `pnpm test:all` 권장. 기본 `pnpm test`에 eval을 섞지 않는 이유: Slice 3a 단계에서는 golden 생성/수정 빈도가 높아 local friction 유발. Slice 3b(세션 3~6 authoring) 완료 후 정책 재정렬 예정. 근거: `docs/superpowers/specs/2026-04-13-slice-3a-eval-harness-design.md` §1.1.

## Golden-file regime (eval harness)

위치: `tests/eval/`. 각 fixture당 `expected/`에 정규화된 JSON과 raw text(starter files) golden이 박혀 있다.

### Fixture

- `tests/eval/fixtures/sample-spring-core/` — core-only 경로. `examples/sample-spring-project/`를 temp dir로 복사해 사용.
- `tests/eval/fixtures/sample-spring-with-lifecycle/` — optional concept(`spring.lifecycle.05`) inclusion 경로.

### 갱신 절차

Pack/engine/adapter 변경으로 golden이 바뀌어야 할 때:

```bash
UPDATE_GOLDEN=1 pnpm test:eval
```

그 후 `git diff tests/eval/fixtures/*/expected/`로 **반드시 리뷰**하고 의도한 변화만 커밋한다. `UPDATE_GOLDEN`은 로컬 전용. CI에서 set되면 의도치 않은 golden 덮어쓰기가 발생하므로 절대 금지.

### 새 fixture 추가 시

- `tests/eval/fixtures/<name>/README.md`에 의도와 "현재 박힌 상태가 의도된 현재 동작임"을 명시.
- `golden-submissions/<sessionId>/`에 pass case 입력 파일 복사.
- 최초 실행은 `UPDATE_GOLDEN=1 pnpm test:eval`로 golden 생성.

### Normalizer 규약

`tests/eval/helpers/snapshot-normalize.ts`가 처리:
- 절대 경로 `ctx.repoRoot` → `<REPO_ROOT>`
- ISO timestamp → `<TIMESTAMP>`
- `/tmp/` 및 `os.tmpdir()` → `<TMP>`
- Object key는 정렬, 배열 순서는 보존

Starter 파일(raw text golden)은 normalizer를 거치지 않는다. `normalize`된 값에 timestamp/repoRoot가 남아 있으면 그게 버그.

## Slice 기반 개발

**흐름:** spec → plan → implement, 세션 하나를 수직으로 관통시킨 뒤 확장.

1. **Spec** — 브레인스토밍 후 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`. `superpowers:brainstorming` skill 사용.
2. **Plan** — 승인된 spec을 구현 계획으로 분해. `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`. `superpowers:writing-plans` skill 사용.
3. **Implement** — plan을 따라 TDD + 커밋. `superpowers:executing-plans`, `superpowers:test-driven-development`, `superpowers:verification-before-completion` 활용.

Slice 0/1/2/3a는 이미 merge 완료. 상세는 `agent_docs/mvp-roadmap.md`.

## 커밋 / PR 규약

- 브랜치: `feature/slice-<n>-<topic>` (예: `feature/slice-3a-eval-harness`).
- 커밋 메시지 prefix: `feat(eval):`, `fix(eval):`, `test(eval):`, `docs:`, `chore(eval):`, `refactor(eval):` 등. Slice 3a 커밋 로그 참고.
- PR은 slice 단위로 병합. 리뷰 피드백은 별도 `fix(scope): address PR review findings` 커밋으로 반영.
- 커밋 전 `pnpm test` 기본 통과, eval 영향 있으면 `pnpm test:eval`도 수동 확인.

## Integration test 원칙

Integration test는 fixture repo의 **temp copy**에서 수행한다 (`createFixtureCopy`). `examples/sample-spring-project/`를 직접 오염시키지 않는다. In-process `Orchestrator` 호출 패턴 사용 (CLI subprocess 미사용).

## 금지 사항

- Linter 역할을 LLM에 맡기지 말 것. 결정적 툴 사용.
- Claude가 concept graph/session 순서/hidden test 결과를 임의 변경하지 말 것.
- Private artifact(answerKey, hidden tests, `*.internal.json`)를 사용자나 설명에 노출하지 말 것.
- Engine의 grade/grade-quiz 결과를 Claude 판단으로 뒤집지 말 것.
