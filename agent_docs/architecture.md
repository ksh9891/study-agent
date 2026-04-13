# Architecture

상세 근거는 `docs/superpowers/specs/2026-04-11-study-agent-design.md`. 이 문서는 그 핵심만 요약한다.

## 2층 구조

```
User in Claude Code
  → Plugin Skill (SKILL.md 지시문)
    → Claude, Bash로 engine CLI 호출
      → study-agent-engine (apps/engine-cli)
        → Engine Core (packages/engine-core)
          → Adapter Registry → adapter-java
          → Pack Registry → pack-spring-core
          → Sandbox (exercise materialize + test 실행)
          → Progress Store (JSON persistence)
        → JSON → stdout
      → Claude가 JSON 해석 후 튜터 역할
```

## 책임 분리

| 레이어 | 책임 | 가지지 않는 것 |
|---|---|---|
| Plugin Skill | Claude 워크플로 지시, engine CLI 호출 규약 | 도메인 로직, 채점 |
| Engine CLI | 진입점, 커맨드 라우팅, JSON I/O | 비즈니스 로직 |
| Engine Core | 오케스트레이션, registry, grading, progress | LLM 호출, 자연어 생성 |
| Adapter | 언어 감지, capability-tiered CodeModel, test strategy 제공 | 학습 구조 결정, 테스트 실행 |
| Pack | canonical DAG, evidence scoring, session/exercise/quiz 생성, evaluation hook | 코드 분석, 테스트 실행 |

**원칙:** Claude = tutor, Engine = judge. Claude는 engine 판정을 뒤집지 않는다.

## 핵심 설계 결정

### Pack 인스턴시에이션 — canonical DAG + deterministic repo-specific subset
Pack은 canonical concept DAG와 evidence rule을 갖는다. 실행 시 evidence 수집 → score 계산 → required는 기본 포함, optional은 threshold 초과 시 포함 → deterministic topological sort. **같은 repo + 같은 pack + 같은 설정 = 항상 같은 study plan.**

### CodeModel — capability-tiered
장기적으로 richer analysis를 수용하는 full 인터페이스, MVP는 lightweight 구현 ("B-level implementation behind C-shaped interface"). Adapter가 `AdapterCapabilities`를 보고하고 Pack이 `PackRequirements`로 필요한 것을 선언한다. MVP `adapter-java`는 file inventory, annotations, imports, extends/implements, simple anchors까지. `references`, `callGraph`는 미지원.

### Exercise authoring — pack-authored static bundles + deterministic templating
Exercise 콘텐츠의 authoring 책임은 Pack maintainer. Engine은 selection + templating + materialization + grading만 한다. Hidden tests는 정적이고 canonical. **Engine은 semantic generation을 하지 않는다.**

### Quiz grading — deterministic graded + optional reflection
Pass/fail은 deterministic question(`multiple_choice`, `short_answer`, `matching`, `ordering`)만으로 결정. 서술형 reflection은 coaching용, 공식 점수 반영 없음.

### Engine 호출 — CLI-first
Long-running daemon/IPC 미채택. 모든 repo 관련 커맨드는 `--repo <path>`를 받는다. 출력은 공통 envelope `EngineResponse<T>` (`ok`, `command`, `schemaVersion`, `repoRoot`, `data?`, `error?`, `warnings?`, `artifactsPath?`).

### Progress / Unlock
세션 상태: `locked` | `available` | `in_progress` | `passed` | `failed`. Grade/grade-quiz가 sub-result(`exercisePassed`, `quizPassed`) 기록 후 overall `passed` 판정. `passed` 전이 직후 `checkAndUnlock()` 자동 호출해 후속 세션 `locked → available`. 상세: `docs/superpowers/specs/2026-04-12-slice-2-unlock-transition-design.md` §2.

## 모노레포 패키지

MVP는 5개 실제 패키지로 시작. `engine-sdk`, `shared`, `sandbox-runner`, `progress-store`는 `engine-core` 내부 모듈.

| 경로 | 역할 |
|---|---|
| `apps/engine-cli` | `study-agent-engine` CLI 진입점. 커맨드: `run`, `next`, `scaffold`, `grade`, `grade-quiz`, `progress` |
| `packages/engine-core` | 도메인 모델, registry, planning, exercises, grading, sandbox, progress |
| `packages/adapter-java` | Java 감지 + CodeModel + Gradle/Maven TestStrategy |
| `packages/pack-spring-core` | Spring canonical DAG, evidence, session/exercise/quiz bundle |
| `plugins/study-agent` | Claude Code plugin. `skills/` + `bin/study-agent-engine` launcher |

`examples/sample-spring-project/`는 dev fixture, `tests/eval/fixtures/`는 regression fixture(별도 복사본).

## 산출물 레이아웃

**Public** (`.study-agent/` in repo):
```
analysis.json, concept-graph.json, instantiated-dag.json, sessions.json, progress.json
exercises/<sessionId>/{exercise-spec.json, starter/, README.md}
quiz/<sessionId>/quiz.json
reports/<sessionId>-{grade,quiz-grade}.json
```

**Private** (answerKey, hidden tests, internal specs): 개념적으로 repo 밖 (기본 `~/.cache/study-agent/<repo-hash>/`). 사용자/Claude에 노출 금지.

모든 artifact JSON은 top-level `schemaVersion` 필드 포함.
