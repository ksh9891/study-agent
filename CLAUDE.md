# study-supporter

Claude Code용 학습 에이전트 **Study Agent**의 모노레포. 사용자가 제공한 소스코드를 분석해 핵심 개념을 추출하고, 코드 근거 설명 → 미니 구현 실습 → 자동 평가 → 개념 퀴즈 형태의 step-by-step 학습 세션으로 변환한다.

## 지금 어디쯤인가

MVP 1.0 (two-session unlock slice) 완료. Slice 3a (eval harness), 3b (di-03/di-04 authoring) merge 완료. 4개 core 세션(ioc-01 → di-04)이 관통되며, 다음은 Slice 3c(lifecycle-05, aop-06 authoring, optional/advanced). 상세는 `agent_docs/mvp-roadmap.md`.

## 모노레포 레이아웃

```
apps/engine-cli/            # study-agent-engine CLI 진입점
packages/
  engine-core/              # 도메인 모델, registry, planning, grading, sandbox, progress
  adapter-java/             # Java 감지 + CodeModel + TestStrategy
  pack-spring-core/         # Spring canonical DAG, evidence, exercise/quiz bundle
plugins/study-agent/        # Claude Code plugin (skills + bin/study-agent-engine)
examples/sample-spring-project/  # dev fixture
tests/
  integration/              # 기본 test 경로
  eval/                     # golden-file regression harness (별도 vitest project)
docs/superpowers/{specs,plans}/  # 승인된 설계 스펙과 구현 계획
agent_docs/                 # 이 CLAUDE.md가 가리키는 상세 문서
```

## 핵심 용어 (glossary)

- **Pack** — 특정 커리큘럼의 canonical concept DAG + evidence rule + exercise/quiz bundle의 제공자 (`pack-spring-core`). Pack이 authoring 주체.
- **Adapter** — 언어별 코드 분석기. `AdapterCapabilities`를 보고하고 `TestStrategy`를 제공 (`adapter-java`).
- **Engine** — Pack과 Adapter를 오케스트레이션해 session/exercise/quiz를 생성·채점·기록. CLI로 진입 (`study-agent-engine`).
- **Session** — 하나의 concept에 대한 학습 단위. 상태: `locked` | `available` | `in_progress` | `passed` | `failed`.
- **Slice** — 한 세션을 수직으로 관통시키는 구현 단위(plugin + engine + adapter + pack 동시). 개발을 slice 단위로 진행한다.
- **Unlock** — Grade/grade-quiz가 세션을 `passed`로 판정한 직후 후속 세션을 `locked → available`로 자동 전환하는 로직.
- **Capability-tiered CodeModel** — Adapter가 할 수 있는 것을 `capabilities`로 보고, Pack이 필요한 것을 `requirements`로 선언하는 협상 모델.
- **Public vs private artifact** — `.study-agent/`에 쓰는 것은 공개(사용자가 봐도 됨). AnswerKey, hidden tests, internal spec은 private(노출 금지).

## 작업 원칙

- **Claude = tutor, Engine = judge.** 학습 구조와 평가의 source of truth는 deterministic engine. Claude는 engine 판정을 뒤집지 않는다.
- **Pack-authored static bundles + deterministic templating.** Exercise/quiz 콘텐츠는 pack이 author하고 engine은 selection + templating + grading만. Engine이 semantic generation을 하지 않는다.
- **Deterministic first.** 같은 repo + 같은 pack + 같은 설정은 항상 같은 결과. Concept graph, session 순서, hidden tests, quiz answer key, pass/fail 판정은 고정.
- **Slice 기반 수직 관통.** spec (`docs/superpowers/specs/`) → plan (`docs/superpowers/plans/`) → implement. Slice를 가로로 확장하기 전에 세로로 먼저 관통시킨다.

## 주요 명령

```bash
pnpm test          # unit + integration (fast, default)
pnpm test:eval     # golden-file regression harness
pnpm test:all      # 둘 다
pnpm build         # pnpm -r build

UPDATE_GOLDEN=1 pnpm test:eval   # 의도한 golden 갱신. 반드시 git diff 리뷰 후 커밋.
```

Node ≥ 20, pnpm workspace. TypeScript + Vitest.

## 금지 / 주의

- Linter 역할을 LLM에 맡기지 말 것. 결정적 툴 사용.
- Private artifact(answerKey, hidden tests, `*.internal.json`)를 사용자나 설명에 노출하지 말 것.
- `examples/sample-spring-project/`를 integration/eval test가 직접 수정하지 말 것. 항상 temp copy.
- `UPDATE_GOLDEN=1`은 로컬 전용. CI에서 set 금지.

## 더 읽기

- `agent_docs/architecture.md` — 2층 구조, 책임 분리, 핵심 설계 결정, 산출물 레이아웃
- `agent_docs/workflows.md` — test 계층, golden 갱신 절차, slice 흐름, 커밋/PR 규약
- `agent_docs/mvp-roadmap.md` — 제품 정의, MVP 완료 기준, slice 현황, 확장 경로
- `docs/superpowers/specs/` — 승인된 설계 스펙 (원문 근거)
- `docs/superpowers/plans/` — 구현 계획 (slice별)
- `README.md` — 간단한 테스트 실행법 요약

상세 스펙은 `docs/superpowers/specs/2026-04-11-study-agent-design.md`가 single source of truth.

## 이 문서의 최신성

이 `CLAUDE.md`와 `agent_docs/*`는 slice merge 시점에 수기로 갱신한다. 코드와 어긋날 경우 **`docs/superpowers/specs/`의 가장 최근 date-stamped 스펙을 우선**하고, 이 문서는 후속 PR로 정정한다. Slice plan의 완료 체크리스트에 `agent_docs` 반영 여부를 포함할 것.
