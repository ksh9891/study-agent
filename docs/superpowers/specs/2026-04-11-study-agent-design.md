# Study Agent — MVP 설계 스펙

## 문서 정보

- 작성일: 2026-04-11
- 기반 문서: study-agent-plugin-design_V2.md
- 상태: 브레인스토밍 완료, 구현 계획 대기

---

## 1. 제품 정의

### 1.1 한 줄 정의

Study Agent는 사용자가 제공한 소스코드를 분석하여 핵심 개념을 추출하고, step-by-step 학습 세션으로 변환한 뒤, 코드 근거 설명 → 미니 구현 실습 → 자동 평가 → 개념 퀴즈를 제공하는 Claude Code용 학습 에이전트다.

### 1.2 핵심 가치

- 큰 코드베이스를 학습 경로로 압축한다.
- 설명을 항상 실제 코드 근거와 연결한다.
- 사용자가 핵심 원리를 직접 재구현해보게 만든다.
- hidden tests와 퀴즈를 통해 이해 완료 여부를 판정한다.
- Claude Code 안에서 자연스럽게 실행되는 대화형 학습 경험을 제공한다.

### 1.3 MVP 범위

**포함:**
- Claude Code plugin package
- `/study-agent:run`, `/study-agent:next`, `/study-agent:exercise`, `/study-agent:quiz`, `/study-agent:grade`, `/study-agent:progress`
- Java adapter + Spring Core pack
- 2-session unlock slice (세션 1, 2 완전 관통 + unlock transition)
- 나머지 세션 구조 생성 (fully authored는 선택적)
- exercise scaffold, hidden test 기반 grading, deterministic quiz, progress 저장

**제외:**
- 웹 UI, 독립 CLI UX, 다중 언어 동시 지원, 시각화 대시보드
- 협업 기능, 원격 실행 인프라, 자체 LLM provider abstraction

### 1.4 MVP 1.0 완료 기준: Two-Session Unlock Slice

1. sample Spring project에서 `/study-agent:run`이 동작 (pack detection, session 생성, .study-agent/ 산출물)
2. 세션 목록 최소 3개 이상 생성
3. 최소 2개 세션이 완전 관통: run → explain → exercise/grade + quiz/grade-quiz → progress
4. 세션 간 unlock transition 검증 필수: 세션 1 passed → 세션 2 locked→available
5. Integration test가 run → exercise → grade → progress + unlock transition 포함

---

## 2. 핵심 설계 원칙

### 2.1 Claude Code host-runtime native

Study Agent는 Claude Code plugin으로 배포된다. 모델 추론, 대화형 튜터링, 코드 탐색은 Claude Code runtime이 맡는다.

### 2.2 Deterministic engine 우선

학습 구조와 평가의 source of truth는 deterministic engine이다. 반드시 고정되는 것: concept graph, session 순서, exercise blueprint, starter files, hidden tests, quiz answer key, pass/fail 판정.

### 2.3 Claude는 tutor, engine은 judge

- Claude = 설명자 / 진행자 / 코치
- Engine = 판정자 / 기록자 / 재현성 보장자

Claude는 engine의 판정을 뒤집을 수 없다.

### 2.4 Pack instantiation model: Canonical DAG + Deterministic Repo-Specific Subset

Pack은 "커리큘럼 스키마"를 제공하고, repo 분석은 그 스키마의 "repo-specific instance"를 결정론적으로 만든다.

- Pack이 가지는 것: canonical concept DAG, concept별 metadata (required/optional), evidence rules, stable ordering rules
- 실행 시: evidence 수집 → score 계산 → required는 기본 포함, optional은 threshold 초과 시 포함 → deterministic topological sort
- 같은 repo + 같은 pack + 같은 설정 = 항상 같은 study plan

### 2.5 Exercise authoring: Pack-authored static bundles + deterministic templating

- Exercise 콘텐츠의 authoring 책임은 Pack maintainer
- Engine의 책임은 selection + templating + materialization + grading
- Hidden tests는 정적이고 canonical
- Repo-specificity는 맥락(anchor, namespacing, hints) 주입 방식으로 반영
- Engine은 semantic generation을 하지 않고 deterministic composition만 한다

### 2.6 Quiz grading: Deterministic graded + optional reflection coaching

- Pass/fail은 deterministic question만으로 계산
- 서술형(reflection)은 coaching으로만 사용, 공식 점수에 반영하지 않음
- Claude는 judge가 아니라 tutor

---

## 3. 시스템 아키텍처

### 3.1 2층 구조

```
User in Claude Code
  → Plugin Skill (SKILL.md = Claude에게 주는 지침)
    → Claude reads skill, calls engine via Bash tool
      → study-agent-engine CLI
        → Engine Core
          → Adapter Registry → adapter-java (capability-tiered CodeModel)
          → Pack Registry → pack-spring-core (canonical DAG + evidence scoring)
          → Sandbox (exercise materialization + test execution)
          → Progress Store (local JSON persistence)
        → JSON output to stdout
      → Claude reads JSON, explains to user as tutor
```

### 3.2 책임 분리

| 레이어 | 책임 | 소유하지 않는 것 |
|--------|------|-----------------|
| Plugin Skill | Claude에게 워크플로 지시, engine CLI 호출 규약, 사용자 대화 가이드 | 도메인 로직, 채점, 진도 판정 |
| Engine CLI | 진입점, 커맨드 라우팅, JSON I/O | 비즈니스 로직 (core에 위임) |
| Engine Core | 오케스트레이션, 도메인 모델, registry, grading pipeline, progress | LLM 호출, 자연어 생성 |
| Adapter | 언어 감지, capability-tiered CodeModel 생성, test strategy 제공 | 학습 구조 결정, 테스트 실행 |
| Pack | canonical DAG, evidence scoring, session instantiation, exercise bundles, quiz specs | 코드 분석, 테스트 실행 |

### 3.3 Engine CLI 호출 모델

CLI-first, high-level orchestration command + low-level debug subcommands.

Skill은 Claude에게 engine CLI를 Bash tool로 호출하도록 지시한다. Plugin의 `bin/` 아래 실행 파일은 PATH에 올라가므로 bare command 호출 가능.

**원칙:** repo 상태를 읽거나 쓰는 모든 커맨드는 `--repo <path>`를 받는다.

```bash
# 고수준 (일상 사용)
study-agent-engine run --repo . --json
study-agent-engine scaffold --repo . --session di-01 --json
study-agent-engine grade --repo . --session di-01 --submission-path ./solution --json
study-agent-engine grade-quiz --repo . --session di-01 --answers-file answers.json --json
study-agent-engine progress --repo . --json
study-agent-engine next --repo . --json

# 저수준 (디버깅/개발)
study-agent-engine scan --repo . --json
study-agent-engine detect-pack --repo . --json
study-agent-engine build-sessions --repo . --json
study-agent-engine quiz-spec --repo . --session di-01 --json
```

**Skill UX 규약:** skill은 사용자에게 경로를 묻지 않고 convention path를 계산하여 `--submission-path`를 내부적으로 넘긴다. 엔진 CLI 자체는 항상 명시적 경로를 받는다.

### 3.4 JSON 출력 Envelope

모든 CLI 응답은 공통 envelope을 따른다.

```ts
interface EngineResponse<T> {
  ok: boolean;
  command: string;
  schemaVersion: string;
  repoRoot: string;
  packId?: string;
  data?: T;
  error?: { code: string; message: string };
  warnings?: string[];
  artifactsPath?: string;
}
```

### 3.5 Long-running server 제외

MVP에서 long-running daemon/IPC 모델은 채택하지 않는다. 향후 성능 압력 시 MCP server mode 추가를 검토한다.

---

## 4. 도메인 모델

### 4.1 핵심 파이프라인

```
RepoContext
  → Adapter.detect() → LanguageDetectResult
  → Adapter.buildCodeModel() → CodeModelResult { codeModel, capabilities }
  → PackRegistry.selectBestPack()
      (internally calls each Pack.detect() → PackMatchResult)
  → SelectedPack.collectEvidence() → EvidenceMap
  → SelectedPack.instantiateDAG() → InstantiatedDAG
  → SelectedPack.buildSessions() → StudySessionSpec[]
  → Engine writes artifacts
```

### 4.2 Capability-Tiered CodeModel

**인터페이스:** 장기적으로 richer analysis를 수용하는 full CodeModel 인터페이스.
**구현:** MVP는 lightweight extraction부터 시작. "B-level implementation behind C-shaped interface."

```ts
interface CodeModelResult {
  codeModel: CodeModel;
  capabilities: AdapterCapabilities;
}

interface AdapterCapabilities {
  fileIndex: boolean;
  dependencies: boolean;
  annotations: boolean;
  imports: boolean;
  inheritance: boolean;
  shallowSymbols: boolean;
  references: boolean;      // MVP: false
  callGraph: boolean;        // MVP: false
}
```

**MVP adapter-java 최소 제공:**
- file inventory, package/class/interface names, imports, annotations
- extends/implements, dependency manifest (pom.xml, build.gradle)
- configuration markers (@Configuration, @Bean 등)
- simple text anchors (file path + line range)
- optional: shallow symbol index

**MVP에서 하지 않는 것:**
- full semantic symbol table, precise reference graph, whole-program call graph

### 4.3 Pack Requirements

```ts
interface PackRequirements {
  requiredCapabilities: Partial<AdapterCapabilities>;
  preferredCapabilities?: Partial<AdapterCapabilities>;
  degradationRules: DegradationRule[];
}
```

- required: 없으면 pack 동작 불가
- preferred: 있으면 더 나은 결과
- degradation: capability 부재 시 동작 방식

### 4.4 ConceptNode (Canonical Definition)

```ts
interface ConceptNode {
  id: string;
  title: string;
  summary: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  inclusionPolicy: "required" | "optional";
  stage?: "core" | "advanced";
  evidenceRules: EvidenceRule[];
  tags?: string[];
}
```

ConceptNode는 pack 원본의 canonical definition이다. Repo-specific evidence는 포함하지 않는다.

### 4.5 InstantiatedDAG (Repo-Specific Subset)

```ts
interface InstantiatedDAG {
  packId: string;
  repoContext: { repoName: string; rootPath: string };
  includedConcepts: InstantiatedConcept[];
  excludedConcepts: ExcludedConcept[];
  conceptOrder: string[];  // deterministic topological sort
}

interface InstantiatedConcept {
  conceptId: string;
  evidenceScore: number;
  evidenceEntries: EvidenceEntry[];
  inclusionReason: "required" | "evidence_threshold_met";
}

interface ExcludedConcept {
  conceptId: string;
  evidenceScore: number;
  exclusionReason: "below_threshold" | "missing_prerequisite" | "capability_degraded";
}
```

### 4.6 StudySessionSpec

```ts
interface StudySessionSpec {
  id: string;
  conceptId: string;
  title: string;
  learningGoals: string[];
  explanationOutline: ExplanationOutlineItem[];
  evidence: CodeEvidence[];
  misconceptions?: string[];
  prerequisites?: string[];
  unlockRule?: UnlockRule;
}
```

### 4.7 ExerciseSpec (Internal / Public 분리)

```ts
// Engine source of truth (internal store에만 저장)
interface ExerciseSpecInternal {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  templateBundle: string;           // pack authored asset (source of truth)
  templateVariables: Record<string, string>;  // materialization params
  starterFiles: StarterFile[];      // materialized result metadata (not source)
  expectedArtifacts: string[];
  repoAnchors: CodeEvidence[];
  hiddenTestPlan: HiddenTestPlan;
  hints?: string[];
}

// Claude/user에 노출 가능한 뷰
interface ExerciseSpecPublic {
  id: string;
  sessionId: string;
  title: string;
  prompt: string;
  starterFiles: StarterFile[];
  expectedArtifacts: string[];
  repoAnchors: CodeEvidence[];
  hints?: string[];
}
```

> `templateVariables`는 MVP에서 `Record<string, string>`. 향후 `Record<string, string | number | boolean>`으로 확장 검토.

### 4.8 QuizSpec (Internal / Public 분리)

```ts
interface QuizSpecInternal {
  id: string;
  sessionId: string;
  gradedQuestions: GradedQuestion[];
  reflectionQuestions?: ReflectionQuestion[];
  answerKey: QuizAnswerKey;
  passingScore: number;
  normalizationRules: NormalizationRule[];
}

interface QuizSpecPublic {
  id: string;
  sessionId: string;
  gradedQuestions: GradedQuestion[];
  reflectionQuestions?: ReflectionQuestion[];
  passingScore: number;
}

interface GradedQuestion {
  id: string;
  type: "multiple_choice" | "short_answer" | "matching" | "ordering";
  prompt: string;
  choices?: string[];
  weight: number;
}

interface ReflectionQuestion {
  id: string;
  prompt: string;
  rubric: string[];
  expectedPoints: string[];
  feedbackHints: string[];
}
```

### 4.9 EvaluationResult

```ts
interface EvaluationResult {
  passed: boolean;
  score: number;
  rubric: RubricItemResult[];
  feedback: string[];
  nextAction?: "retry" | "review" | "advance";
}
```

### 4.10 Language Adapter Interface

```ts
interface LanguageAdapter {
  manifest: ExtensionManifest;
  detect(repo: RepoContext): Promise<LanguageDetectResult | null>;
  buildCodeModel(input: { repo: RepoContext }): Promise<CodeModelResult>;
  getTestStrategy(input: { repo: RepoContext }): Promise<TestStrategy>;
}

interface TestStrategy {
  runner: "gradle" | "maven" | "npm" | "custom";
  command: string;
  args: string[];
  workingDir?: string;
  timeout?: number;
  env?: Record<string, string>;
  // 실행은 shell join이 아닌 structured spawn으로 수행
}
```

Adapter는 test strategy를 제공하고, Sandbox가 실제 프로세스 실행을 담당한다.

### 4.11 Study Pack Interface

```ts
interface StudyPack {
  manifest: ExtensionManifest;
  requirements: PackRequirements;

  detect(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    capabilities: AdapterCapabilities;
    language: LanguageDetectResult;
  }): Promise<PackMatchResult | null>;

  collectEvidence(input: {
    repo: RepoContext;
    codeModel: CodeModel;
  }): Promise<EvidenceMap>;

  instantiateDAG(input: {
    evidenceMap: EvidenceMap;
  }): Promise<InstantiatedDAG>;

  buildSessions(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    instantiatedDAG: InstantiatedDAG;
  }): Promise<StudySessionSpec[]>;

  buildExerciseSpec(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySessionSpec;
  }): Promise<ExerciseSpecInternal | null>;

  buildQuizSpec(input: {
    session: StudySessionSpec;
    exercise?: ExerciseSpecInternal | null;
  }): Promise<QuizSpecInternal | null>;

  evaluateSubmission(input: {
    repo: RepoContext;
    codeModel: CodeModel;
    session: StudySessionSpec;
    submissionPath: string;
  }): Promise<EvaluationResult>;
}
```

> **`evaluateSubmission()` 책임 경계:** 이 메서드는 hidden test를 직접 실행하지 않는다. Engine의 Sandbox가 TestStrategy에 따라 테스트를 실행하고, 그 결과(test result)를 Pack에 전달한다. Pack의 `evaluateSubmission()`은 engine이 수집한 test result와 pack 고유의 evaluation rule을 바탕으로 최종 EvaluationResult를 구성하는 hook이다. 향후 `buildEvaluationPlan()` + engine-side grading execution으로 분리 가능.
```

### 4.12 Progress / Unlock Model

세션 상태: `locked` | `available` | `in_progress` | `passed` | `failed`

통과 규칙:
- exercise required: hidden test 통과
- quiz required: passing score 이상
- 둘 다 required: 둘 다 만족해야 passed

---

## 5. 산출물 구조

### 5.1 Public Artifacts

```
.study-agent/
  analysis.json              # summary: repo info, adapter id, capabilities,
                             #   matched pack, detected signals, warnings
  concept-graph.json         # canonical DAG (pack 원본)
  instantiated-dag.json      # repo-specific subset
  sessions.json              # StudySessionSpec[]
  progress.json              # 세션별 상태 + score
  exercises/
    spring.di.01/
      exercise-spec.json     # ExerciseSpecPublic
      starter/
      README.md
  quiz/
    spring.di.01/
      quiz.json              # QuizSpecPublic
  reports/
    spring.di.01-grade.json
    spring.di.01-quiz-grade.json
```

### 5.2 Private Artifacts

Private artifact store는 개념적으로 repo 밖에 위치한다. 기본 구현은 `~/.cache/study-agent/<repo-hash>/` 또는 OS temp 디렉토리. 개발 편의상 repo 내 `.study-agent-internal/`에 둘 수 있으나, 이는 convenience path일 뿐 보안 경계가 아니다.

```
<internal-cache>/
  codemodel.cache.json                 # raw CodeModel cache
  exercises/
    spring.di.01/
      exercise-spec.internal.json      # ExerciseSpecInternal
      hidden-tests/
  quiz/
    spring.di.01/
      quiz.internal.json               # QuizSpecInternal (answerKey 포함)
```

### 5.3 Artifact Schema Versioning

각 artifact JSON 파일도 CLI envelope과 독립적으로 schema version을 갖는다. 모든 `.study-agent/` artifact의 최상위에 `schemaVersion` 필드를 포함한다.

```json
{
  "schemaVersion": "0.1",
  "sessions": [...]
}
```

이를 통해:
- engine 업그레이드 시 artifact migration 가능
- snapshot test에서 schema 변경 감지
- 오픈소스 기여자가 만든 artifact와의 호환성 검증

---

## 6. Plugin Skill 설계

### 6.1 Skill의 본질

Plugin skill = SKILL.md = Claude에게 주는 지시문. 코드가 아니다. Skill이 실행되면 내용이 Claude 프롬프트에 주입되고, Claude가 지시에 따라 engine CLI를 호출하고 결과를 설명한다.

### 6.2 MVP Skill 목록

| Skill | Engine 호출 | Claude의 역할 |
|-------|-------------|---------------|
| `/study-agent:run` | `run --repo . --json` | 결과 해석, 세션 소개, 첫 세션 시작 |
| `/study-agent:next` | `next --repo . --json` | engine이 추천한 세션 설명 시작 |
| `/study-agent:exercise` | `scaffold --repo . --session <id> --json` | starter 안내, 구현 코칭 |
| `/study-agent:quiz` | `quiz-spec` → 답 수집 → `grade-quiz` | 출제, 수집, 결과 안내, reflection 코칭 |
| `/study-agent:grade` | `grade --repo . --session <id> --submission-path <path> --json` | 결과 해석, 피드백 |
| `/study-agent:progress` | `progress --repo . --json` | 상태 요약, 다음 추천 |

### 6.3 SKILL.md 공통 템플릿

```markdown
---
name: <skill-name>
description: <한 줄 설명>
---

## 목적
## 인자 해석 규칙
## 사전 조건
## 실행 흐름
## 오류 처리
## 금지 사항
```

### 6.4 공통 인자 해석 규칙

세션 id를 받는 skill(exercise, quiz, grade)에 공통 적용:

1. 세션 id 명시 → 해당 세션 사용 (locked면 선행 세션 안내, 미존재면 오류)
2. 세션 id 생략 → 현재 in_progress 세션 우선
3. in_progress 없음 → engine의 next 추천 세션 사용
4. 그래도 없음 → 사용자에게 명확히 질문

### 6.5 `/study-agent:run` 핵심 흐름

1. `study-agent-engine run --repo . --json` 실행
2. `planStatus` 확인:
   - `fresh`: 새 계획 → 세션 목록 소개, 첫 세션 시작
   - `reused`: 기존 계획 → 현재 진도와 상태 안내
   - `stale`: repo 변경됨 → 사용자에게 재생성 여부 확인 → `--force`
3. 금지: concept graph/session 순서 임의 변경, hidden tests 언급

### 6.6 `/study-agent:quiz` 상태 머신

```
not_started → collecting_answers → graded → reflection_done
```

1. `quiz-spec` 획득 → gradedQuestions 하나씩 출제 → 답 수집
2. 수집 완료 → temp JSON 저장 → `grade-quiz` 호출
3. 채점 결과 안내 (총점, 통과 여부, 틀린 문항 피드백)
4. reflectionQuestions → graded 이후에만 진행, 공식 점수 무관

답변 temp file 스키마:
```json
{
  "sessionId": "spring.di.01",
  "answers": [
    { "questionId": "q1", "answer": "B" },
    { "questionId": "q2", "answer": "BeanDefinition" }
  ]
}
```

중단/재개: MVP에서는 중단 시 답변 유실, 재시작 시 처음부터. 향후 부분 재개 검토.

### 6.7 `!<command>` 전처리 사용 범위

| 허용 | 비권장 |
|------|--------|
| `progress`, `next` (읽기 전용 조회) | `run`, `scaffold`, `grade`, `grade-quiz` (상태 변경/실패 가능) |

상태를 바꾸는 명령은 명시적 Bash tool 호출로 남겨야 로그/오류 처리/재시도가 명확하다.

### 6.8 Skill 간 전이 흐름

```
/study-agent:run
  → 세션 목록 + 첫 세션 설명
  → /study-agent:exercise → 실습 → /study-agent:grade → 채점
  → /study-agent:quiz → 퀴즈 → 자동 채점
  → 둘 다 통과 → progress 업데이트
  → /study-agent:next → 다음 세션
  → /study-agent:progress (언제든)
```

---

## 7. Vertical Slice 구현 전략

### 7.1 접근 방식

Vertical slice: 한 세션의 전체 수직 단면을 관통시킨 뒤 세션을 추가하며 넓힌다. Plugin + engine + adapter + pack을 동시에 한 세션 단위로 구축.

### 7.2 Slice 0: Skeleton + 연결 검증

**목표:** 모노레포 뼈대 + plugin 인식 + engine CLI stub 응답

**완료 기준:**
- `claude --plugin-dir ./plugins/study-agent`로 plugin 로드, `/study-agent:run` 인식
- `study-agent-engine run --repo . --json` stub JSON 응답
- `pnpm build && pnpm test` 통과

### 7.3 Slice 1: 세션 1 완전 관통

**목표:** sample Spring project에서 세션 1(IoC/BeanDefinition)이 run → exercise → grade → quiz → progress까지 동작

**필수 커맨드 (Slice 1에서 완성):** `run`, `scaffold`, `grade`, `grade-quiz`, `progress`

**지연 가능 커맨드 (내부 함수로만, CLI 노출은 이후):** `scan`, `detect-pack`, `build-sessions`, `quiz-spec`

**레이어별 작업:**

| 레이어 | 작업 |
|--------|------|
| adapter-java | detect, buildCodeModel (MVP lightweight), getTestStrategy |
| pack-spring-core | detect, canonical DAG (6 concepts), collectEvidence, instantiateDAG, 세션 1 buildSessions, exercise bundle, quiz spec |
| engine-core | PackRegistry.selectBestPack, evidence pipeline, DAG instantiation, scaffold materialization, sandbox runner, quiz grading, progress store, public/internal artifact 분리 |
| engine-cli | 고수준 커맨드 (run, scaffold, grade, grade-quiz, progress) |
| plugin skills | run, exercise, grade, quiz, progress SKILL.md |

**완료 기준:**
- 세션 1 전체 학습 루프 동작
- progress.json에 세션 1 상태 기록
- integration test: run → scaffold → grade → quiz-grade → progress

### 7.4 Slice 2: 세션 2 + Unlock Transition = MVP 1.0

**목표:** 세션 2 추가 + 세션 간 unlock 전이 검증

**작업:** 세션 2 bundle/quiz, unlock 판정, `next` 커맨드, `planStatus` (fresh/reused/stale), `/study-agent:next` skill

**핵심 검증:**
```
세션 1: locked → available → in_progress → passed
세션 2: locked → available (세션 1 passed 후)
next → 세션 2 추천
run 재실행 → planStatus: "reused"
```

**완료 기준:** 2-session unlock transition + integration test = **MVP 1.0 완료**

### 7.5 Slice 3: 나머지 세션 + Eval Harness

**작업:** 세션 3~6 구조, eval harness (golden fixture, snapshot test, regression test)

**완료 기준:** `pnpm test`로 전체 regression 검증, pack 변경 시 snapshot diff 감지

### 7.6 Slice 의존 관계

```
Slice 0 (skeleton)
  → Slice 1 (session 1 full loop)
    → Slice 2 (session 2 + unlock) = MVP 1.0
      → Slice 3 (remaining sessions + eval harness)
```

---

## 8. 모노레포 구조

### 8.1 패키지 전략

Logical boundary first, package boundary later. MVP는 5개 실제 패키지로 시작. engine-sdk, shared, sandbox-runner, progress-store는 engine-core 내부 모듈.

### 8.2 디렉토리 구조

```
study-agent/
  plugins/
    study-agent/
      .claude-plugin/plugin.json
      skills/
        run/SKILL.md
        next/SKILL.md
        exercise/SKILL.md
        quiz/SKILL.md
        grade/SKILL.md
        progress/SKILL.md
      bin/
        study-agent-engine          # Node launcher script (not symlink)
      README.md
  apps/
    engine-cli/
      src/
      package.json
  packages/
    engine-core/
      src/
        domain/                     # types, contracts
        codemodel/                  # CodeModel processing
        planning/                   # DAG instantiation, session building
        exercises/                  # scaffold materialization, templating
        grading/                    # hidden test execution, quiz grading
        sandbox/                    # process spawning, test strategy execution
        progress/                   # JSON persistence, unlock logic
      package.json
    adapter-java/
      src/
      package.json
    pack-spring-core/
      src/
      concept-dag/                  # canonical DAG definition
      exercises/                    # static exercise bundles
        di-01-ioc-bean-metadata/
        di-02-bean-registration/
      quiz/                         # quiz specs (internal, answerKey 포함)
      package.json
  examples/
    sample-spring-project/
  tests/
    integration/
    fixtures/
  docs/
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
```

### 8.3 기술 스택

- Host Runtime: Claude Code plugin system
- Engine Language: TypeScript
- Runtime: Node.js
- Package Manager: pnpm
- Test Runner: Vitest
- `bin/study-agent-engine`: Node launcher script (not symlink, cross-platform safe)

### 8.4 Integration Test 원칙

Integration test는 fixture repo의 temp copy에서 수행한다. `examples/sample-spring-project/`를 직접 오염시키지 않는다.

---

## 9. V2 대비 핵심 변경/추가 사항

이 스펙은 V2 설계서를 기반으로 하되, 브레인스토밍을 통해 다음을 명확화/변경했다.

| 주제 | V2 상태 | 이 스펙에서의 결정 |
|------|---------|-------------------|
| Pack instantiation | 모호 (정적 vs 동적 불분명) | Canonical DAG + deterministic repo-specific subset |
| CodeModel 깊이 | "매우 단순한 CodeModel부터 시작" | Capability-tiered: adapter가 capabilities 보고, pack이 요구사항 선언 |
| Exercise 작성 주체 | 모호 | Pack-authored static bundles + deterministic templating only |
| Engine 호출 방식 | CLI + 라이브러리 | CLI-first with high/low-level commands, no daemon |
| Quiz 채점 | 모호 (서술형 포함 여부 불분명) | Deterministic graded + optional reflection coaching |
| MVP 완료 기준 | "5-8개 세션" (범위 불분명) | Two-session unlock slice |
| 패키지 수 | 12+ packages | 5 real packages + engine-core 내부 모듈 |
| Hidden test/answerKey 노출 | 고려 없음 | Public/private artifact 분리 |
| ConceptNode | evidence와 canonical 혼재 | Canonical definition과 InstantiatedConcept 분리 |
| PackRegistry/Pack.detect 역할 | 겹침 | Registry는 selectBestPack, Pack은 detect |
| CLI --repo 규약 | 비통일 | 모든 repo 관련 커맨드에 --repo 통일 |
| run 재실행 정책 | skill에서 판단 | Engine이 planStatus 반환 (fresh/reused/stale) |
| next 세션 추천 | Claude가 progress 읽고 판단 | Engine의 next 커맨드가 판단 |
| Adapter 테스트 책임 | "테스트 실행" | Test strategy 제공만 (실행은 Sandbox) |

---

## 10. 구현 시 상세화할 보조 타입

다음 타입들은 이 스펙에서 참조되지만 상세 정의는 구현 단계(Slice 1)에서 확정한다:

- `EvidenceRule` — pack이 정의하는 evidence 탐지 규칙 (annotation pattern, dependency name 등)
- `EvidenceEntry` — 실제 repo에서 수집된 개별 evidence (file path, line range, matched pattern)
- `EvidenceMap` — `Record<conceptId, EvidenceEntry[]>`
- `CodeEvidence` — 코드 근거 (file path + line range + description)
- `StarterFile` — materialized starter file metadata (path, description)
- `HiddenTestPlan` — hidden test 파일 목록과 실행 설정
- `UnlockRule` — 세션 unlock 조건 (prerequisite sessions, required pass conditions)
- `NormalizationRule` — quiz 답변 정규화 규칙 (case insensitive, whitespace, alias)
- `DegradationRule` — capability 부재 시 pack 동작 변경 규칙
- `QuizAnswerKey` — graded question별 정답 정의
- `ExplanationOutlineItem` — 설명 구조의 개별 항목
- `RubricItemResult` — 채점 루브릭 개별 결과
- `PackMatchResult` — pack 적합도 결과 (score, confidence, signals)
- `RepoContext`, `LanguageDetectResult`, `ExtensionManifest` — V2 정의 유지

---

## 11. 향후 확장 경로

MVP 이후 검토 가능한 확장:

- 추가 Language Adapter (adapter-typescript, adapter-python)
- 추가 Study Pack (pack-jpa-hibernate, pack-kafka-core, pack-react-fundamentals)
- Engine MCP server mode (long-running daemon 대안)
- CodeModel advanced capabilities (references, callGraph)
- Quiz 부분 재개
- repo-explorer subagent, misconception-reviewer subagent
- headless automation (CI grading regression)
