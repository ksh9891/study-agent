# MVP Roadmap

## 제품 한 줄 정의

Study Agent는 사용자가 제공한 소스코드를 분석해 핵심 개념을 추출하고, step-by-step 학습 세션으로 변환한 뒤, 코드 근거 설명 → 미니 구현 실습 → 자동 평가 → 개념 퀴즈를 제공하는 Claude Code용 학습 에이전트다.

## MVP 1.0 완료 기준 — Two-Session Unlock Slice

1. sample Spring project에서 `/study-agent:run` 동작 (pack detection, session 생성, `.study-agent/` 산출물)
2. 세션 목록 최소 3개 이상 생성
3. 최소 2개 세션이 완전 관통: run → explain → exercise/grade + quiz/grade-quiz → progress
4. 세션 간 unlock transition 검증 필수: 세션 1 passed → 세션 2 `locked → available`
5. Integration test가 run → exercise → grade → progress + unlock transition 커버

## Slice 현황

| Slice | 상태 | 내용 |
|---|---|---|
| 0 — Skeleton | ✅ merged | 모노레포 뼈대, plugin 인식, engine CLI stub |
| 1 — 세션 1 완전 관통 | ✅ merged | `spring.ioc.01` full loop (`run`/`scaffold`/`grade`/`grade-quiz`/`progress`) |
| 2 — 세션 2 + Unlock = **MVP 1.0** | ✅ merged | `spring.di.02`, `checkAndUnlock()`, `next` 커맨드, `planStatus: stale` |
| 3a — Eval harness | ✅ merged (PR #3) | `tests/eval/` 골든 파일, 2 fixture, planning/exercises/quiz/grade snapshot |
| 3b — 세션 3~6 authoring | ⏳ next | 남은 세션 exercise/quiz bundle. Harness 위에서 `UPDATE_GOLDEN=1`로 갱신하며 진행 |

상세: 각 slice의 spec은 `docs/superpowers/specs/`, 구현 계획은 `docs/superpowers/plans/`.

## MVP 포함 / 제외

**포함:**
- Claude Code plugin package (`plugins/study-agent`)
- Skills: `run`, `next`, `exercise`, `quiz`, `grade`, `progress`
- Java adapter + Spring Core pack
- 2-session unlock slice
- 나머지 세션은 구조만 (fully authored는 선택)
- Exercise scaffold, hidden-test grading, deterministic quiz, progress 저장

**제외:**
- 웹 UI, 독립 CLI UX, 다중 언어 동시 지원, 시각화 대시보드
- 협업 기능, 원격 실행 인프라, 자체 LLM provider abstraction

## MVP 이후 확장 (non-goal for now)

- 추가 Language Adapter (TypeScript, Python)
- 추가 Study Pack (JPA/Hibernate, Kafka, React)
- Engine MCP server mode (long-running daemon 대안)
- CodeModel advanced capabilities (`references`, `callGraph`)
- Quiz 부분 재개, subagent 기반 repo-explorer / misconception-reviewer
- Headless CI grading regression
